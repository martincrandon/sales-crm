type SourceRecordDetailsProps = {
  properties: Record<string, unknown>;
  markdownProperties?: Record<string, unknown>;
  body: string;
  sourceSystem: string | null;
};

function displayProperty(value: unknown) {
  if (typeof value === "string") return value || "—";
  if (value === null || value === undefined) return "—";
  if (typeof value === "number" || typeof value === "boolean") return String(value);
  return JSON.stringify(value, null, 2);
}

export default function SourceRecordDetails({
  properties,
  markdownProperties = {},
  body,
  sourceSystem,
}: SourceRecordDetailsProps) {
  if (
    !sourceSystem &&
    Object.keys(properties).length === 0 &&
    Object.keys(markdownProperties).length === 0 &&
    !body
  ) return null;

  return (
    <details className="border-border border-t px-6 py-4">
      <summary className="caption-style text-soft cursor-pointer select-none">
        Imported source details
      </summary>
      <div className="mt-4 flex flex-col gap-5">
        <p className="caption-style text-subtle">
          Source: {sourceSystem || "Imported record"}
        </p>
        {Object.keys(properties).length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="caption-style text-subtle">CSV source properties</h3>
            <dl className="flex flex-col gap-4">
              {Object.entries(properties).map(([name, value]) => (
                <div key={name} className="min-w-0">
                  <dt className="caption-style text-subtle break-words">{name}</dt>
                  <dd className="p-style mt-2 break-words whitespace-pre-wrap">
                    {displayProperty(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {Object.keys(markdownProperties).length > 0 && (
          <section className="flex flex-col gap-4">
            <h3 className="caption-style text-subtle">Markdown export properties</h3>
            <dl className="flex flex-col gap-4">
              {Object.entries(markdownProperties).map(([name, value]) => (
                <div key={name} className="min-w-0">
                  <dt className="caption-style text-subtle break-words">{name}</dt>
                  <dd className="p-style mt-2 break-words whitespace-pre-wrap">
                    {displayProperty(value)}
                  </dd>
                </div>
              ))}
            </dl>
          </section>
        )}
        {body && (
          <div className="min-w-0">
            <h3 className="caption-style text-subtle">Original page body</h3>
            <pre className="p-style text-soft mt-2 max-h-80 overflow-auto whitespace-pre-wrap break-words font-sans">
              {body}
            </pre>
          </div>
        )}
      </div>
    </details>
  );
}
