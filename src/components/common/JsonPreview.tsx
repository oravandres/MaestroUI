interface JsonPreviewProps {
  value: unknown;
  label?: string;
}

export function JsonPreview({ value, label = "JSON payload" }: JsonPreviewProps) {
  return (
    <pre className="json-preview" aria-label={label}>
      {JSON.stringify(value ?? null, null, 2)}
    </pre>
  );
}
