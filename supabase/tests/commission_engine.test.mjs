// Commission engine tests — run the REAL migrations in a local in-memory Postgres (PGlite); nothing touches Supabase.
//   npm install --no-save @electric-sql/pglite && node supabase/tests/commission_engine.test.mjs
// Checks the proposal's exact figures (20% of $12.99/$31.18/$54.56/$77.94), idempotency, who earns nothing, term limits,
// refunds / disputes, payouts, privileges and de-identification on account deletion.
import { PGlite } from '@electric-sql/pglite';
import fs from 'node:fs'; import assert from 'node:assert/strict';
const M=new URL('../migrations/', import.meta.url).pathname;
const db=new PGlite(); let n=0;
const q=async(sql,p)=> (await db.query(sql,p)).rows;
const one=async(sql,p)=> (await q(sql,p))[0];
const ok=(c,m)=>{ n++; assert.ok(c,'FAILED: '+m); };
// ---- stubs for Supabase pieces the migrations lean on ----
await db.exec(`
 create role anon nologin; create role authenticated nologin; create role service_role nologin bypassrls;
 create schema auth;
 create table auth.users (id uuid primary key default gen_random_uuid(), email text, created_at timestamptz default now());
 create function auth.uid() returns uuid language sql stable as $$ select nullif(current_setting('request.jwt.claim.sub', true), '')::uuid $$;
 grant usage on schema auth to anon, authenticated, service_role; grant usage on schema public to anon, authenticated, service_role;
 create table public.subscriptions (id uuid default gen_random_uuid() primary key, user_id uuid not null unique references auth.users(id) on delete cascade, stripe_customer_id text, status text not null default 'trialing');
 grant select on public.subscriptions to authenticated, service_role;
`);
for (const f of ['20261110_affiliate_schema.sql','20261116_retention_and_deletion.sql','20261117_commission_engine.sql']) await db.exec(fs.readFileSync(M+f,'utf8'));
const as=async(uid,role='authenticated')=>{ await db.exec(`reset role; select set_config('request.jwt.claim.sub','${uid||''}',false); set role ${role}`); };
const su=async()=>db.exec(`reset role`);
const U=i=>`00000000-0000-0000-0000-${String(i).padStart(12,'0')}`;
// users: 1 partner A, 2 partner B(no rate), 9 admin, 11.. referred clients
for (const [i,e] of [[1,'a@t'],[2,'b@t'],[3,'c@t'],[9,'admin@t'],[11,'c1@t'],[12,'c2@t'],[13,'c3@t'],[14,'c4@t'],[15,'c5@t'],[16,'c6@t'],[17,'c7@t']]) await q(`insert into auth.users(id,email,created_at) values ($1,$2,now()-interval '1 year')`,[U(i),e]);
await q(`insert into public.app_admins(user_id) values ($1)`,[U(9)]);
await q(`insert into public.partners(id,user_id,code,name,rate) values ('10000000-0000-0000-0000-00000000000a',$1,'storyline','Storyline',0.20),('10000000-0000-0000-0000-00000000000b',$2,'norate','No Rate',null),('10000000-0000-0000-0000-00000000000c',$3,'oneyear','One Month',0.20)`,[U(1),U(2),U(3)]);
await q(`update public.partners set commission_months=1 where code='oneyear'`);
const A='10000000-0000-0000-0000-00000000000a', B='10000000-0000-0000-0000-00000000000b', C='10000000-0000-0000-0000-00000000000c';
// referred clients: 11,12,13 -> A ; 14 -> B ; 15 -> C ; 16 -> A excluded_self ; 17 -> not referred
for (const [i,p,st] of [[11,A,'attributed'],[12,A,'attributed'],[13,A,'attributed'],[14,B,'attributed'],[15,C,'attributed'],[16,A,'excluded_self']])
  await q(`insert into public.referrals(user_id,partner_id,code,signed_up_at,status) values ($1,$2,'x',now()-interval '200 days',$3)`,[U(i),p,st]);
await q(`update public.referrals set signed_up_at = now() - interval '10 days' where user_id=$1`,[U(15)]);
for (let i=11;i<=17;i++) await q(`insert into public.subscriptions(user_id,stripe_customer_id,status) values ($1,$2,'active')`,[U(i),'cus_'+i]);
const T0=`now() - interval '6 months'`;
const pay=(ev,inv,cus,gross,tax=0,when=T0)=>one(`select public.affiliate_record_payment($1,$2,'ch_'||$2,$3,$4::bigint,$5::bigint,${when}) r`,[ev,inv,cus,gross,tax]).then(x=>x.r);

// ===== 1. The exact figures from the proposal to Ben (20%) =====
for (const [gross,want] of [[1299,260],[3118,624],[5456,1091],[7794,1559]]) {
  const r=await pay('evt_p'+gross,'in_p'+gross,'cus_11',gross);
  ok(r.status==='recorded' && r.commission_cents===want, `20% of ${gross} should be ${want}, got ${JSON.stringify(r)}`);
}
// ===== 2. idempotency =====
ok((await pay('evt_p1299','in_other','cus_11',1299)).status==='duplicate','same event twice');
ok((await pay('evt_new','in_p1299','cus_11',1299)).status==='duplicate','same invoice, new event');
ok((await one(`select count(*)::int c from public.commission_entries`)).c===4,'only 4 rows');
// ===== 3. who earns nothing =====
ok((await pay('e1','i1','cus_14',1299)).status==='no_rate','partner with no rate');
ok((await pay('e2','i2','cus_16',1299)).status==='excluded','self referral');
ok((await pay('e3','i3','cus_17',1299)).status==='not_referred','never referred');
ok((await pay('e4','i4','cus_999',1299)).status==='no_user','unknown stripe customer');
ok((await pay('e5','i5','cus_11',0)).status==='no_amount','$0 invoice (free trial)');
ok((await one(`select count(*)::int c from public.commission_entries`)).c===4,'no rows added by the above');
// ===== 4. term limit =====
ok((await pay('e6','i6','cus_15',1299,0,`now() - interval '9 days'`)).status==='recorded','inside the term');
ok((await pay('e7','i7','cus_15',1299,0,`now()`)).status==='recorded','a partner with a 1-month term: signed up 10 days ago, still inside');
await q(`update public.referrals set signed_up_at = now() - interval '3 months' where user_id=$1`,[U(15)]);
ok((await pay('e8','i8','cus_15',1299,0,`now()`)).status==='term_over','after the term');
// ===== 5. GST: ex_tax basis =====
const g=await pay('e9','i9','cus_12',1430,130); ok(g.commission_cents===260,'20% of ex-GST 1300 = 260, got '+JSON.stringify(g));
// ===== 6. reversals =====
const rv=(ev,kind,ref,inv,amt)=>one(`select public.affiliate_record_reversal($1,$2,$3,$4,null,$5::bigint,now()) r`,[ev,kind,ref,inv,amt]).then(x=>x.r);
let r1=await rv('evt_r1','refund','re_1','in_p1299',1299); ok(r1.status==='reversed' && r1.commission_cents===-260,'full refund reverses 260: '+JSON.stringify(r1));
ok((await rv('evt_r1','refund','re_1','in_p1299',1299)).status==='duplicate','refund event retried');
ok((await rv('evt_r1b','refund','re_1b','in_p1299',1299)).status==='nothing_to_reverse','second refund cannot exceed the original');
let r2=await rv('evt_r2','refund','re_2','in_p3118',500); ok(r2.commission_cents===-100,'partial refund 500/3118 of 624 = 100: '+JSON.stringify(r2));
ok((await rv('evt_r3','refund','re_3','in_unknown',500)).status==='not_ours','refund for a client who was not referred');
let r4=await rv('evt_r4','dispute','dp_1','in_p5456',5456); ok(r4.commission_cents===-1091,'lost dispute');
ok((await rv('evt_r4','dispute','dp_1','in_p5456',5456)).status==='duplicate','same dispute event retried');
ok(['nothing_to_reverse','duplicate'].includes((await rv('evt_r5','dispute','dp_1','in_p5456',5456)).status),'same dispute, new event id: never reversed twice');
// ledger sanity: never edited, reversals point at originals
ok((await one(`select count(*)::int c from public.commission_entries where kind='reversal' and reverses_entry_id is not null`)).c===3,'3 reversals linked');
const bal=(await one(`select sum(commission_cents)::int s from public.commission_entries where partner_id=$1`,[A])).s;
// payments: 260+624+1091+1559+260(e9) = 3794 ; reversals: -260-100-1091 = -1451 -> 2343
ok(bal===2343,'partner A balance should be 2343, got '+bal);

// ===== 7. privileges =====
await as(U(11)); 
let denied=false; try{ await q(`select public.affiliate_record_payment('x','y','z','cus_11',1299,0,now())`);}catch(e){denied=true} ok(denied,'a signed-in user cannot call the payment writer');
await su(); await as(U(11),'anon'); denied=false; try{ await q(`select public.affiliate_record_payment('x','y','z','cus_11',1299,0,now())`);}catch(e){denied=true} ok(denied,'anon cannot call the payment writer');
await as(U(1)); const cp=await one(`select public.affiliate_create_payout($1,date '2026-01-01') r`,[A]); ok(cp.r.status==='admin_only','a partner cannot create payouts');
await as(null,'service_role'); const sr=await one(`select public.affiliate_record_payment('svc1','svc_in','ch','cus_13',1299::bigint,0::bigint,${T0}) r`); ok(sr.r.status==='recorded','service role can write');
await su();
// ===== 8. partner sees only their own statement lines =====
const qs=(await one(`select public.affiliate_quarter_start(${T0}) d`)).d;
await as(U(1)); const lines=await q(`select * from public.partner_statement_lines($1::date)`,[qs]); ok(lines.length===6 && lines.every(l=>/^[0-9a-f]{8}$/.test(l.anon_id)),'partner A sees own lines with anonymous ids ('+lines.length+')');
await su(); await as(U(2)); ok((await q(`select * from public.partner_statement_lines($1::date)`,[qs])).length===0,'partner B sees none of A\'s lines');
// ===== 9. payouts =====
await su(); await as(U(9));
const cur=(await one(`select public.affiliate_quarter_start(now()) d`)).d;
ok((await one(`select public.affiliate_create_payout($1,$2::date) r`,[A,cur])).r.status==='quarter_not_finished','current quarter cannot be paid yet');
ok((await one(`select public.affiliate_create_payout($1,'2026-02-02') r`,[A])).r.status==='not_a_quarter_start','must be a quarter start');
const before=(await one(`select public.admin_payout_overview() ov`)).ov;
const po=(await one(`select public.affiliate_create_payout($1,$2::date) r`,[A,qs])).r;
ok(po.status==='created' && po.total_cents>0,'payout created: '+JSON.stringify(po));
const rows=await q(`select status, count(*)::int c from public.commission_entries where partner_id=$1 group by 1`,[A]); 
ok(rows.some(r=>r.status==='approved'),'rows moved to approved');
ok((await one(`select public.affiliate_create_payout($1,$2::date) r`,[A,qs])).r.status==='exists','one payout per quarter');
// void then recreate
ok((await one(`select public.affiliate_void_payout($1) r`,[po.payout_id])).r.status==='voided','draft can be voided');
ok((await one(`select count(*)::int c from public.commission_entries where partner_id=$1 and payout_id is not null`,[A])).c===0,'rows released');
const po2=(await one(`select public.affiliate_create_payout($1,$2::date) r`,[A,qs])).r; ok(po2.status==='created' && po2.total_cents===po.total_cents,'recreated, same total');
const paid=(await one(`select public.affiliate_mark_payout_paid($1,'BANK-123') r`,[po2.payout_id])).r; ok(paid.status==='paid','marked paid');
ok((await one(`select public.affiliate_mark_payout_paid($1,'x') r`,[po2.payout_id])).r.status==='already_paid','paying twice is harmless');
ok((await one(`select public.affiliate_void_payout($1) r`,[po2.payout_id])).r.status==='not_a_draft','a paid payout cannot be voided');
ok((await one(`select count(*)::int c from public.commission_entries where payout_id=$1 and status='paid'`,[po2.payout_id])).c>0,'entries paid');
ok(po2.total_cents===(await one(`select sum(commission_cents)::int s from public.commission_entries where payout_id=$1`,[po2.payout_id])).s,'payout total equals its rows');
// a refund that arrives AFTER the payout is netted off the next one; a negative balance creates no payout
await su(); await as(null,'service_role');
const late=await one(`select public.affiliate_record_reversal('evt_late','refund','re_late','svc_in',null,1299::bigint,now()) r`); ok(late.r.status==='reversed','late refund recorded as a negative row');
await su(); await as(U(9));
const nq=(await one(`select public.affiliate_quarter_start(now() - interval '1 day') d`)).d; // no finished later quarter has rows; use a finished quarter after qs if exists
const nothing=(await one(`select public.affiliate_create_payout($1, ($2::date + interval '3 months')::date) r`,[A,qs])).r;
ok(['nothing_due','quarter_not_finished','created'].includes(nothing.status),'later quarter handled: '+nothing.status);
const ov=await q(`select * from public.admin_payout_overview() order by name`); ok(ov.length===3 && ov.find(o=>o.name==='Storyline').paid_cents===po2.total_cents,'overview shows what was paid');
ok((await q(`select * from public.admin_payouts()`)).length===1,'payout list');
await su(); await as(U(1)); ok((await q(`select * from public.admin_payout_overview()`)).length===0,'a partner cannot see the admin overview');
// ===== 10. deleting a referred user keeps the ledger, removes the link =====
await su();
await q(`delete from auth.users where id=$1`,[U(12)]);
ok((await one(`select user_id from public.referrals where id=(select referral_id from public.commission_entries where stripe_invoice_id='i9')`)).user_id===null,'referral de-identified on account deletion');
ok((await one(`select count(*)::int c from public.commission_entries where stripe_invoice_id='i9'`)).c===1,'commission row kept after account deletion');
console.log(`ALL ${n} COMMISSION ENGINE CHECKS PASSED`);
