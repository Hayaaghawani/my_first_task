function formatValue(param) {
  const value = param.value;
  const displayValue =
    value !== null && value !== undefined && value !== ''
      ? String(value)
      : param.option_label_en || param.option_label_ar || '—';

  return param.unit ? `${displayValue} ${param.unit}` : displayValue;
}

function groupParams(params) {
  const groupedParams = new Map();

  for (const param of params) {
    const fieldName = param.field_name || 'Other';
    const values = groupedParams.get(fieldName) || [];
    values.push(formatValue(param));
    groupedParams.set(fieldName, values);
  }

  return Array.from(groupedParams, ([fieldName, values]) => ({
    fieldName,
    values,
  }));
}

export default function CustomParams({ params = [] }) {
  const groupedParams = groupParams(params);

  return (
    <section className="custom-params" aria-labelledby="custom-params-title">
      <h3 id="custom-params-title">Details</h3>
      {groupedParams.length === 0 ? (
        <p className="muted-text">No additional details available.</p>
      ) : (
        <div className="table-scroll">
          <table>
            <thead>
              <tr>
                <th scope="col">Field</th>
                <th scope="col">Value</th>
              </tr>
            </thead>
            <tbody>
              {groupedParams.map(({ fieldName, values }) => (
                <tr key={fieldName}>
                  <th scope="row">{fieldName}</th>
                  <td>
                    {values.length === 1 ? (
                      values[0]
                    ) : (
                      <ul className="custom-param-values">
                        {values.map((value, index) => (
                          <li key={`${fieldName}-${index}`}>{value}</li>
                        ))}
                      </ul>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
