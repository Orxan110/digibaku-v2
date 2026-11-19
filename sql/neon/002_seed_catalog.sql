-- =====================================================================
-- DigiBaku v2 — 002: BAŞLANĞIC KATALOQ (isteğe bağlı, 001-dən sonra)
-- =====================================================================
insert into categories (key, name_az, name_ru, name_en, icon, sort_order) values
  ('film_serial',  'Film və seriallar',     'Фильмы и сериалы',        'Movies & series',        '🎬', 1),
  ('video',        'Video və əyləncə',      'Видео и развлечения',     'Video & entertainment',  '▶️', 2),
  ('ai',           'Süni intellekt',        'Искусственный интеллект', 'Artificial intelligence', '✨', 3),
  ('music',        'Musiqi',                'Музыка',                  'Music',                  '🎵', 4),
  ('design',       'Dizayn və yaradıcılıq', 'Дизайн и творчество',     'Design & creativity',    '🎨', 5),
  ('education',    'Təhsil',                'Образование',             'Education',              '📚', 6),
  ('security_vpn', 'Təhlükəsizlik və VPN',  'Безопасность и VPN',      'Security & VPN',         '🛡️', 7),
  ('games',        'Oyun və əyləncə',       'Игры и развлечения',      'Games & fun',            '🎮', 8)
on conflict (key) do nothing;

insert into site_products (product_key, name, name_az, name_ru, name_en, slug, category_key, image_url, sort_order, active) values
  ('netflix',      'Netflix Premium',              'Netflix Premium',              'Netflix Premium',              'Netflix Premium',              'netflix',      'film_serial',  '/assets/img/netflix.webp',    1,  true),
  ('youtube',      'YouTube Premium',              'YouTube Premium',              'YouTube Premium',              'YouTube Premium',              'youtube',      'video',        '/assets/img/youtube.webp',    2,  true),
  ('chatgpt',      'ChatGPT Business',             'ChatGPT Business',             'ChatGPT Business',             'ChatGPT Business',             'chatgpt',      'ai',           '/assets/img/chatgpt1ay.webp', 3,  true),
  ('gemini',       'Gemini Advanced Pro',          'Gemini Advanced Pro',          'Gemini Advanced Pro',          'Gemini Advanced Pro',          'gemini',       'ai',           '/assets/img/gemini.avif',     4,  true),
  ('grammarly',    'Grammarly Premium',            'Grammarly Premium',            'Grammarly Premium',            'Grammarly Premium',            'grammarly',    'education',    null,                          5,  true),
  ('spotify',      'Spotify Premium',              'Spotify Premium',              'Spotify Premium',              'Spotify Premium',              'spotify',      'music',        '/assets/img/spotfiy.webp',    6,  true),
  ('canva',        'Canva Pro',                    'Canva Pro',                    'Canva Pro',                    'Canva Pro',                    'canva',        'design',       '/assets/img/canva.webp',      7,  true),
  ('deezer',       'Deezer Premium',               'Deezer Premium',               'Deezer Premium',               'Deezer Premium',               'deezer',       'music',        '/assets/img/deezer.webp',     8,  true),
  ('avast_vpn',    'Avast SecureLine VPN',         'Avast SecureLine VPN',         'Avast SecureLine VPN',         'Avast SecureLine VPN',         'avast-vpn',    'security_vpn', null,                          9,  true),
  ('hbo_max',      'HBO MAX TV (HBO Max + BluTV)', 'HBO MAX TV (HBO Max + BluTV)', 'HBO MAX TV (HBO Max + BluTV)', 'HBO MAX TV (HBO Max + BluTV)', 'hbo-max',      'video',        null,                          10, true),
  ('amazon_prime', 'Amazon Prime Video',           'Amazon Prime Video',           'Amazon Prime Video',           'Amazon Prime Video',           'amazon-prime', 'video',        null,                          11, true),
  ('duolingo',     'Duolingo Super',               'Duolingo Super',               'Duolingo Super',               'Duolingo Super',               'duolingo',     'education',    null,                          12, true)
on conflict (product_key) do update set
  category_key = excluded.category_key,
  sort_order   = excluded.sort_order,
  image_url    = coalesce(site_products.image_url, excluded.image_url);

-- Qiymətlər: 1 ay = price_1_month, 2 ay = price_2_month, 1 il = price_12_month
-- DİQQƏT: Canva (6 AZN / 12 ay) və Amazon (2.98 AZN) qiymətlərini işə salmazdan əvvəl yoxlayın.
insert into product_prices (product_key, product_name, price_1_month, price_2_month, price_12_month) values
  ('netflix',      'Netflix Premium',              7,     13,   null),
  ('youtube',      'YouTube Premium',              8,     14,   null),
  ('chatgpt',      'ChatGPT Business',             12,    null, null),
  ('gemini',       'Gemini Advanced Pro',          8,     null, null),
  ('grammarly',    'Grammarly Premium',            10.99, null, null),
  ('spotify',      'Spotify Premium',              8,     null, null),
  ('canva',        'Canva Pro',                    null,  null, 6),
  ('deezer',       'Deezer Premium',               5.99,  null, null),
  ('avast_vpn',    'Avast SecureLine VPN',         null,  null, 19.99),
  ('hbo_max',      'HBO MAX TV (HBO Max + BluTV)', 4.99,  8.99, null),
  ('amazon_prime', 'Amazon Prime Video',           2.98,  null, null),
  ('duolingo',     'Duolingo Super',               null,  null, 19.99)
on conflict (product_key) do nothing;
