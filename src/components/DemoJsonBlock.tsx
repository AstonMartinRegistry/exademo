"use client";

type Props = {
  data: unknown;
  error: string | null;
  loading: boolean;
};

export default function DemoJsonBlock({ data, error, loading }: Props) {
  if (loading) {
    return <p className="demo-status">Calling Exa…</p>;
  }

  if (error) {
    return (
      <pre className="demo-pre demo-pre--error" role="alert">
        {error}
      </pre>
    );
  }

  if (data === null) {
    return <p className="demo-status demo-status--muted">Run a request to see JSON.</p>;
  }

  return (
    <pre className="demo-pre">
      {JSON.stringify(data, null, 2)}
    </pre>
  );
}
