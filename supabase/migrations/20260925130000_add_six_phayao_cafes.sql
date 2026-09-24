-- Add six verified cafes within the supported Mueang Phayao–Mae Ka region.
-- Coordinates and opening information were checked against cafe listings;
-- ON CONFLICT keeps this migration safe if any of the cafes were added manually.
insert into public.cafes (
  slug, name_th, name_en, description_th, description_en, address_th, address_en,
  phone, open_time, close_time, closed_days, price_range, tags, lifestyle_tags,
  area, lat, lng, menu_highlights, base_rating, is_active
)
values
  (
    'phayao-coffee-roaster', 'โรงคั่วกาแฟพะเยา', 'Phayao Coffee Roaster',
    'โรงคั่วและคาเฟ่ที่มีเครื่องดื่ม อาหาร และเบเกอรี่ พร้อมพื้นที่สวน ที่จอดรถ และ Wi-Fi',
    'A local roastery and cafe serving drinks, food, and bakery, with a garden, parking, and Wi-Fi.',
    '59/1 หมู่ 17 ตำบลบ้านต๋อม อำเภอเมืองพะเยา', '59/1 Moo 17, Ban Tom, Mueang Phayao',
    '087-433-9449', '07:00', '17:00', '{}', 2, '{work,chill}', '{wifi,parking}',
    'lakeside', 19.1879092, 99.8867167,
    '[{"th":"กาแฟคั่วสด","en":"Freshly roasted coffee"},{"th":"อาหารและเบเกอรี่","en":"Food and bakery"}]'::jsonb,
    0, true
  ),
  (
    'premm-cafe', 'เปรม คาเฟ่', 'PREMM CAFE',
    'คาเฟ่โทนขาวดำ มีเครื่องดื่ม กาแฟ เค้ก และอาหารจานเดียว วันอังคารเปิด 10:00–19:00 น. วันอื่น 09:00–17:00 น.',
    'A black-and-white themed cafe serving coffee, drinks, cakes, and Thai meals. Open 10:00–19:00 on Tuesdays and 09:00–17:00 on other days.',
    'ตำบลบ้านต๋อม อำเภอเมืองพะเยา', 'Ban Tom, Mueang Phayao',
    '088-318-9669', '09:00', '17:00', '{}', 2, '{chill,dessert}', '{photo,wifi,pet-friendly,parking}',
    'lakeside', 19.209616775779324, 99.87087802961469,
    '[{"th":"ข้าวซอยไก่เปรม","en":"Premm chicken khao soi"},{"th":"บลูเบอร์รีชีสเค้ก","en":"Blueberry cheesecake"}]'::jsonb,
    0, true
  ),
  (
    'see-u-again', 'ซียูอะเกน', 'See U Again',
    'คาเฟ่และร้านอาหารใกล้วัดศรีโคมคำ มีทั้งของหวาน เครื่องดื่ม และอาหารจานด่วน',
    'A cafe and restaurant near Wat Si Khom Kham, serving desserts, drinks, and quick meals.',
    'ถนนพหลโยธิน ตำบลเวียง ใกล้วัดศรีโคมคำ', 'Phahonyothin Road, Wiang, near Wat Si Khom Kham',
    '093-150-5001', '10:30', '20:00', '{}', 1, '{chill,dessert}', '{}',
    'lakeside', 19.173846, 99.893403,
    '[{"th":"บิงซู","en":"Bingsu"},{"th":"ฮันนี่โทสต์","en":"Honey toast"}]'::jsonb,
    0, true
  ),
  (
    'baan-ton-tao-coffee-food', 'บ้านต้นเต๊า Coffee&food', 'Baan Ton Tao Coffee & Food',
    'คาเฟ่ในสวนริมลำธารที่บ้านบัว มีเครื่องดื่ม ขนม และอาหาร',
    'A garden cafe beside a stream in Ban Bua, serving drinks, desserts, and meals.',
    'บ้านบัว ตำบลบ้านตุ่น อำเภอเมืองพะเยา (เลี้ยวขวาก่อนถึงสะพานข้ามลำน้ำ)',
    'Ban Bua, Ban Tun, Mueang Phayao (turn right before the river bridge)',
    '094-719-2653', '10:00', '18:00', '{}', 2, '{chill,view,dessert}', '{family}',
    'lakeside', 19.147489580965104, 99.82887879755322,
    '[{"th":"น้ำผึ้งมะนาวโซดา","en":"Honey lime soda"},{"th":"อาหารเหนือและเค้ก","en":"Northern Thai dishes and cake"}]'::jsonb,
    0, true
  ),
  (
    'one-pastry-bakery', 'One Pastry Bakery Homemade', 'One Pastry Bakery Homemade',
    'ร้านเบเกอรี่โฮมเมดในตำบลแม่กา เปิดช่วงเย็นถึงดึก',
    'A homemade bakery in Mae Ka, open from late afternoon into the evening.',
    'ตำบลแม่กา อำเภอเมืองพะเยา', 'Mae Ka, Mueang Phayao',
    null, '16:00', '23:59', '{}', 1, '{dessert}', '{}',
    'maeka-uni', 19.0314609, 99.9271037,
    '[{"th":"เบเกอรี่โฮมเมด","en":"Homemade bakery"}]'::jsonb,
    0, true
  ),
  (
    'baan-matcha-mae-ka', 'Baan Matcha หน้า ม.พะเยา', 'Baan Matcha (Matcha House)',
    'ร้านกาแฟและชาหน้ามหาวิทยาลัยพะเยา มีเมนูมัทฉะและเครื่องดื่ม วันเสาร์เปิด 13:00–17:00 น. วันอื่น 10:00–18:00 น.',
    'A coffee and tea cafe near the University of Phayao, with matcha and other drinks. Open 13:00–17:00 on Saturdays and 10:00–18:00 on other days.',
    '436/16 ตำบลแม่กา อำเภอเมืองพะเยา', '436/16, Mae Ka, Mueang Phayao',
    '090-607-0335', '10:00', '18:00', '{}', 2, '{chill}', '{}',
    'maeka-uni', 19.029736610018325, 99.92871739516619,
    '[{"th":"มัทฉะ","en":"Matcha"},{"th":"กาแฟและชา","en":"Coffee and tea"}]'::jsonb,
    0, true
  )
on conflict (slug) do nothing;
