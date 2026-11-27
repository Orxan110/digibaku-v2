// Abunə müddəti: ödənilmiş/hazırlanan/təhvil verilən sifarişlərdən hesablanır.
// Bitmə tarixi = sifarişin tarixi + müddət (ay). Hər istifadəçi+məhsul üçün ən gec bitən tarix götürülür.
const REMIND_DAYS = 3;

// orders.user_id uuid, customer_profiles.user_id text: müqayisədə ::text ilə çeviririk
const SUBS = `select o.user_id::text as user_id, i->>'product_key' as product_key,
    max(i->>'name') as name,
    max(o.created_at + make_interval(months => (i->>'months')::int)) as ends_at
  from orders o, jsonb_array_elements(o.items::jsonb) i
  where o.status in ('confirmed', 'processing', 'completed')
  group by o.user_id, i->>'product_key'`;

// userFilter=true olduqda $1 = istifadəçi id-si
function expiringSql(userFilter) {
  return `select s.user_id, s.product_key, s.name, s.ends_at, u.email, u.name as user_name, cp.phone
    from (${SUBS}) s
    left join neon_auth."user" u on u.id::text = s.user_id
    left join customer_profiles cp on cp.user_id = s.user_id
    where s.ends_at > now() and s.ends_at <= now() + make_interval(days => ${REMIND_DAYS})
    ${userFilter ? "and s.user_id = $1" : ""}
    order by s.ends_at`;
}

module.exports = { REMIND_DAYS, expiringSql };
