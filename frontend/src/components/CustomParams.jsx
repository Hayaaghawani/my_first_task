function formatValue(param) {
  const value = param.value;
  const displayValue =
    value !== null && value !== undefined && value !== ''
      ? String(value)
      : param.option_label_en || param.option_label_ar || '—';

  return param.unit ? `${displayValue} ${param.unit}` : displayValue;
}

export default function CustomParams({ params = [] }) {
  return (
    <section className="custom-params" aria-labelledby="custom-params-title">
      <h3 id="custom-params-title">Details</h3>
      {params.length === 0 ? (
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
              {params.map((param, index) => (
                <tr key={`${param.field_name}-${index}`}>
                  <th scope="row">{param.field_name}</th>
                  <td>{formatValue(param)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}
