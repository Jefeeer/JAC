export default async function rlsSuite(db, q) {
  let pass = 0, fail = 0
  const ok = (name, cond, extra = "") => { if (cond) pass++; else fail++; console.log(cond ? "  ✓" : "  ✗", name, cond ? "" : extra) }
  const as = async (role, sub) => {
    await db.exec(`reset role;`)
    await db.query(`select set_config('request.jwt.claim.sub', $1, false)`, [sub ?? ""])
    if (role !== "postgres") await db.exec(`set role ${role};`)
  }
  const tryq = async (sql, params) => { try { return { rows: (await db.query(sql, params)).rows } } catch (e) { return { error: e.message } } }
  const n = async (sql) => Number((await q(sql))[0].n)

  // --- setup as superuser
  await as("postgres")
  const [pre] = await q(`insert into customers (full_name, email, phone) values ('Ana Cruz','ana@fleet.ph','0917') returning id`)
  await q(`insert into quotes (quote_type, customer_id, contact_name, contact_email, contact_phone, truck_id) select 'truck', '${pre.id}', 'Ana Cruz','ana@fleet.ph','0917', id from trucks limit 1`)
  const [ua] = await q(`insert into auth.users (email, raw_user_meta_data) values ('ana@fleet.ph', '{"full_name":"Ana Cruz"}') returning id`)
  const [ub] = await q(`insert into auth.users (email) values ('ben@haul.ph') returning id`)
  const [uadm] = await q(`insert into auth.users (email) values ('admin@jac.ph') returning id`)
  const [umech] = await q(`insert into auth.users (email) values ('mech@jac.ph') returning id`)
  const [uadv] = await q(`insert into auth.users (email) values ('advisor@jac.ph') returning id`)
  await q(`update profiles set role='admin' where id='${uadm.id}'`)
  await q(`update profiles set role='mechanic' where id='${umech.id}'`)
  await q(`update profiles set role='service_advisor' where id='${uadv.id}'`)
  const [ca] = await q(`select id from customers where profile_id='${ua.id}'`)
  const [cb] = await q(`select id from customers where profile_id='${ub.id}'`)
  ok("signup links pre-existing customer by email", ca?.id === pre.id)
  ok("signup creates customer when none exists", !!cb)

  // --- anon
  await as("anon")
  ok("anon reads 15 published trucks", (await n(`select count(*) n from trucks`)) === 15)
  await as("postgres"); await q(`update trucks set is_published=false where slug='jac-n90-box-van-2025'`)
  await as("anon")
  ok("anon cannot see unpublished truck", (await n(`select count(*) n from trucks`)) === 14)
  ok("anon cannot see unpublished truck images", (await n(`select count(*) n from truck_images`)) === 15)
  ok("anon reads parts", (await n(`select count(*) n from parts`)) === 38)
  ok("anon sees no customers", (await n(`select count(*) n from customers`)) === 0)
  ok("anon sees no quotes", (await n(`select count(*) n from quotes`)) === 0)
  ok("anon cannot insert quote", !!(await tryq(`insert into quotes (quote_type, contact_name, contact_email, contact_phone) values ('part','x','x@x.x','1')`)).error)
  ok("anon cannot call hit_rate_limit", !!(await tryq(`select hit_rate_limit('k', 5, 60)`)).error)
  ok("anon reads branches", (await n(`select count(*) n from branches`)) === 7)

  // --- customer A
  await as("authenticated", ua.id)
  ok("A sees own pre-signup quote", (await n(`select count(*) n from quotes`)) === 1)
  ok("A sees only own customer row", (await n(`select count(*) n from customers`)) === 1)
  ok("A cannot see unpublished truck", (await n(`select count(*) n from trucks`)) === 14)
  ok("A cannot escalate role", !!(await tryq(`update profiles set role='admin' where id='${ua.id}'`)).error)
  ok("A can update own name", !(await tryq(`update profiles set full_name='Ana C.' where id='${ua.id}'`)).error)
  const fu = await tryq(`insert into fleet_units (customer_id, model, plate_number, current_mileage_km) values ('${ca.id}','N55','NAD 6513', 48000) returning id`)
  ok("A adds own fleet unit", !fu.error, fu.error)
  const fuId = fu.rows?.[0]?.id
  ok("A cannot add fleet unit for B", !!(await tryq(`insert into fleet_units (customer_id, model) values ('${cb.id}','N55')`)).error)
  const qa = await tryq(`insert into quotes (quote_type, customer_id, contact_name, contact_email, contact_phone) values ('part','${ca.id}','Ana','ana@fleet.ph','0917') returning id`)
  ok("A creates quote via portal", !qa.error, qa.error)
  ok("A cannot create discounted quote", !!(await tryq(`insert into quotes (quote_type, customer_id, contact_name, contact_email, contact_phone, discount) values ('part','${ca.id}','Ana','a@a.a','1', 5000)`)).error)
  const bk = await tryq(`insert into service_bookings (customer_id, contact_name, contact_phone, truck_model, issue_description, preferred_date, preferred_time_slot, fleet_unit_id) values ('${ca.id}','Ana','0917','N55','Brake noise', current_date + 3, '08:00-10:00', '${fuId}') returning id, reference`)
  ok("A creates booking", !bk.error, bk.error)
  ok("booking reference format", /^BK-\d{4}-\d{5}$/.test(bk.rows?.[0]?.reference ?? ""), bk.rows?.[0]?.reference)
  const bkId = bk.rows?.[0]?.id
  ok("A cannot change booking date", !!(await tryq(`update service_bookings set preferred_date = current_date + 9 where id='${bkId}'`)).error)
  ok("A cannot see staff notes", (await n(`select count(*) n from staff_notes`)) === 0)
  ok("A cannot insert notifications", !!(await tryq(`insert into notifications (recipient_id, type, title) values ('${ua.id}','x','x')`)).error)

  // --- customer B
  await as("authenticated", ub.id)
  ok("B cannot see A's quotes", (await n(`select count(*) n from quotes`)) === 0)
  ok("B cannot see A's fleet", (await n(`select count(*) n from fleet_units`)) === 0)
  ok("B cannot see A's booking", (await n(`select count(*) n from service_bookings`)) === 0)
  ok("B cannot update A's booking (0 rows)", (await tryq(`update service_bookings set status='cancelled' where id='${bkId}' returning id`)).rows?.length === 0)

  // --- service advisor
  await as("authenticated", uadv.id)
  ok("advisor sees role-broadcast booking notification", (await n(`select count(*) n from notifications`)) >= 1)
  ok("advisor confirms booking", !(await tryq(`update service_bookings set status='confirmed', scheduled_at=now() where id='${bkId}'`)).error)
  const jo = await tryq(`insert into job_orders (booking_id, customer_id, fleet_unit_id, truck_model, plate_number, mileage_in_km, complaint, mechanic_id, service_advisor_id) values ('${bkId}','${ca.id}','${fuId}','N55','NAD 6513', 50210,'Brake noise','${umech.id}','${uadv.id}') returning id, reference`)
  ok("advisor creates job order", !jo.error, jo.error)
  const joId = jo.rows?.[0]?.id
  await q(`insert into job_order_items (job_order_id, item_type, description, quantity, unit_price) values ('${joId}','labor','Brake overhaul', 1, 3500), ('${joId}','part','Brake shoe set', 1, 3950)`)
  ok("job totals recalculated", Number((await q(`select grand_total g from job_orders where id='${joId}'`))[0].g) === 7450)
  ok("advisor adds staff note", !(await tryq(`insert into staff_notes (entity_type, entity_id, body, author_id) values ('job_order','${joId}','Call after 5pm','${uadv.id}')`)).error)

  // --- mechanic
  await as("authenticated", umech.id)
  ok("mechanic sees assigned job", (await n(`select count(*) n from job_orders`)) === 1)
  { const r = await tryq(`update job_orders set status='diagnosing', diagnosis='Worn rear shoes' where id='${joId}'`); ok("mechanic sets diagnosing", !r.error, r.error) }
  ok("mechanic cannot change totals", !!(await tryq(`update job_orders set labor_total=1 where id='${joId}'`)).error)
  ok("mechanic cannot release", !!(await tryq(`update job_orders set status='released' where id='${joId}'`)).error)
  ok("mechanic cannot read quotes", (await n(`select count(*) n from quotes`)) === 0)
  ok("mechanic sets ready", !(await tryq(`update job_orders set status='ready' where id='${joId}'`)).error)

  // --- customer A live status
  await as("authenticated", ua.id)
  const ev = await q(`select to_status from job_order_events order by created_at`)
  ok("A sees job timeline", ev.map((e) => e.to_status).join(",") === "received,diagnosing,ready", JSON.stringify(ev))
  const notes = await q(`select id, type from notifications where recipient_id='${ua.id}' order by created_at`)
  ok("A got job.ready notification", notes.some((x) => x.type === "job.ready"))
  ok("A can mark notification read", !(await tryq(`update notifications set read_at=now() where id='${notes[0].id}'`)).error)
  ok("A cannot rewrite notification", !!(await tryq(`update notifications set title='hacked' where id='${notes[0].id}'`)).error)
  ok("A cannot see staff note", (await n(`select count(*) n from staff_notes`)) === 0)
  ok("A sees job items", (await n(`select count(*) n from job_order_items`)) === 2)
  ok("A can cancel confirmed booking", !(await tryq(`update service_bookings set status='cancelled', cancel_reason='changed plans' where id='${bkId}'`)).error)

  // --- release
  await as("authenticated", uadv.id)
  ok("advisor releases job", !(await tryq(`update job_orders set status='released' where id='${joId}'`)).error)
  await as("postgres")
  const [unit] = await q(`select last_service_mileage_km, current_mileage_km, last_service_date from fleet_units where id='${fuId}'`)
  ok("release rolls fleet service history", unit.last_service_mileage_km === 50210 && unit.current_mileage_km === 50210 && !!unit.last_service_date, JSON.stringify(unit))
  const [m] = await q(`select maintenance_state, next_service_mileage_km from fleet_unit_maintenance`)
  ok("maintenance view computes next service", m.next_service_mileage_km === 60210 && m.maintenance_state === "ok", JSON.stringify(m))
  ok("audit log captured job changes", (await n(`select count(*) n from audit_log where table_name='job_orders'`)) >= 4)

  // --- storage
  await as("authenticated", ua.id)
  { const r = await tryq(`insert into storage.objects (bucket_id, name) values ('uploads', '${ua.id}/booking/p1.jpg')`); ok("A uploads to own folder", !r.error, r.error) }
  ok("A cannot upload to B folder", !!(await tryq(`insert into storage.objects (bucket_id, name) values ('uploads', '${ub.id}/x.jpg')`)).error)
  ok("A cannot upload truck images", !!(await tryq(`insert into storage.objects (bucket_id, name) values ('truck-images', 'x.jpg')`)).error)
  await as("authenticated", uadm.id)
  ok("admin uploads truck images", !(await tryq(`insert into storage.objects (bucket_id, name) values ('truck-images', 'n55/1.webp')`)).error)
  ok("admin sees audit log", (await n(`select count(*) n from audit_log`)) > 0)
  ok("admin sees unpublished truck", (await n(`select count(*) n from trucks`)) === 15)

  // --- service role rate limit
  await as("service_role")
  const r = []
  for (let i = 0; i < 4; i++) r.push((await q(`select hit_rate_limit('ip:1.2.3.4:quote', 3, 600) a`))[0].a)
  ok("rate limit allows 3 then blocks", r.join() === "true,true,true,false", r.join())

  console.log(`\n${pass} passed, ${fail} failed`)
}
