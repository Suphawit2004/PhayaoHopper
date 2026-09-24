update public.cafes
set photo = case slug
  when 'phayao-coffee-roaster' then '/images/cafes/phayao-coffee-roaster/main.jpg'
  when 'premm-cafe' then '/images/cafes/premm-cafe/main.jpg'
  when 'see-u-again' then '/images/cafes/see-u-again/main.jpg'
  when 'baan-ton-tao-coffee-food' then '/images/cafes/baan-ton-tao-coffee-food/main.jpg'
  when 'one-pastry-bakery' then '/images/cafes/one-pastry-bakery/main.jpg'
  when 'baan-matcha-mae-ka' then '/images/cafes/baan-matcha-mae-ka/main.jpg'
end
where slug in (
  'phayao-coffee-roaster', 'premm-cafe', 'see-u-again',
  'baan-ton-tao-coffee-food', 'one-pastry-bakery', 'baan-matcha-mae-ka'
);
