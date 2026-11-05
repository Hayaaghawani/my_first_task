const BASIC_LISTING = `
  SELECT
    p.id,
    p.title,
    p.description,
    p.price            AS price_amount,
    p.price_currency,
    p.has_price,
    p.cities_id        AS city_id,
    c.name             AS city_name,
    p.neighborhood_id,
    n.name             AS neighborhood_name
  FROM posts p
  LEFT JOIN cities c ON c.id = p.cities_id
  LEFT JOIN neighborhood n ON n.id = p.neighborhood_id
  WHERE p.id = ?
`;

const CUSTOM_PARAMS = `
  SELECT
    f.id           AS field_id,
    f.name         AS field_name,
    o.label        AS option_label_ar,
    o.label_en     AS option_label_en,
    v.value_1_integer,
    v.value_1_double,
    v.value_string,
    v.value_text,
    v.value_date_1,
    u.label        AS unit
  FROM post_dynamic_attribute_value v
  JOIN post_dynamic_attribute_field f ON f.id = v.field_id
  LEFT JOIN post_dynamic_attribute_option o ON o.id = v.field_option_id_1
  LEFT JOIN unit u ON u.id = v.unit_id
  WHERE v.post_id = ?
    AND v.status = 1
  ORDER BY f.id
`;

module.exports = { BASIC_LISTING, CUSTOM_PARAMS };