import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useEffect, useMemo, useState } from "react";
import { Save } from "lucide-react";
import {
  type Setting,
  displaySettingValue,
  fetchSettings,
  isSecretSetting,
  saveSetting,
} from "@/api/settings";
import { EmptyState } from "@/components/common/EmptyState";
import { ErrorState } from "@/components/common/ErrorState";
import { LoadingState } from "@/components/common/LoadingState";

interface ParsedValue {
  ok: true;
  value: unknown;
}

interface ParseError {
  ok: false;
  message: string;
}

type ParseResult = ParsedValue | ParseError;

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [auditConfirmed, setAuditConfirmed] = useState(false);
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    retry: false,
  });
  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => saveSetting(key, value),
    onSuccess: async () => {
      setAuditConfirmed(false);
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const grouped = useMemo(() => groupSettings(settingsQuery.data?.items ?? []), [settingsQuery.data]);
  const isSelectedSecret = selectedKey.trim() !== "" && isSecretSetting(selectedKey);
  const trimmedRaw = rawValue.trim();
  const secretReplacementMissing = isSelectedSecret && trimmedRaw === "";
  const parseResult = useMemo<ParseResult | null>(() => {
    if (trimmedRaw === "") return null;
    try {
      return { ok: true, value: JSON.parse(rawValue) as unknown };
    } catch {
      return { ok: false, message: "Value must be valid JSON." };
    }
  }, [rawValue, trimmedRaw]);
  const validationError = parseResult && !parseResult.ok ? parseResult.message : "";

  useEffect(() => {
    setAuditConfirmed(false);
  }, [selectedKey]);

  function startEdit(setting: Setting) {
    setSelectedKey(setting.key);
    setRawValue(isSecretSetting(setting.key) ? "" : JSON.stringify(setting.value, null, 2));
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedKey.trim() === "") return;
    if (secretReplacementMissing) return;
    if (isSelectedSecret && !auditConfirmed) return;
    if (!parseResult || !parseResult.ok) return;
    saveMutation.mutate({ key: selectedKey.trim(), value: parseResult.value });
  }

  const saveDisabled =
    selectedKey.trim() === "" ||
    secretReplacementMissing ||
    !parseResult ||
    !parseResult.ok ||
    (isSelectedSecret && !auditConfirmed) ||
    saveMutation.isPending;

  return (
    <div className="page-container">
      <header className="page-header">
        <h1 className="page-title">Settings</h1>
        <p className="page-subtitle">Grouped configuration with masked secret display.</p>
      </header>

      <div className="detail-grid">
        <section className="panel">
          <h2>Settings</h2>
          {settingsQuery.isLoading ? <LoadingState label="Loading settings" /> : null}
          {settingsQuery.isError ? (
            <ErrorState error={settingsQuery.error} onRetry={() => void settingsQuery.refetch()} />
          ) : null}
          {settingsQuery.isSuccess && settingsQuery.data.items.length === 0 ? (
            <EmptyState title="No settings configured" />
          ) : null}
          {Object.entries(grouped).map(([group, settings]) => (
            <div className="settings-group" key={group}>
              <h3>{group}</h3>
              {settings.map((setting) => (
                <button
                  className="setting-row"
                  type="button"
                  key={setting.key}
                  onClick={() => startEdit(setting)}
                >
                  <span>{setting.key}</span>
                  <code>{displaySettingValue(setting)}</code>
                </button>
              ))}
            </div>
          ))}
        </section>

        <section className="panel">
          <h2>Edit setting</h2>
          <form className="form-grid tool-form" onSubmit={submit}>
            <label className="field field-full">
              <span>Key</span>
              <input value={selectedKey} onChange={(event) => setSelectedKey(event.target.value)} />
            </label>
            <label className="field field-full">
              <span>JSON value</span>
              <textarea
                rows={8}
                value={rawValue}
                placeholder={isSelectedSecret ? "Enter replacement secret value as JSON string" : ""}
                aria-invalid={Boolean(validationError) || undefined}
                aria-describedby={validationError ? "settings-validation-error" : undefined}
                onChange={(event) => setRawValue(event.target.value)}
              />
            </label>
            <p
              className={`field-hint ${validationError ? "field-hint-error" : "field-hint-success"}`}
              id={validationError ? "settings-validation-error" : undefined}
              role={validationError ? "alert" : undefined}
            >
              {trimmedRaw === ""
                ? isSelectedSecret
                  ? "Enter the replacement secret value as a JSON-encoded string."
                  : "Enter the new value as JSON (strings must be quoted)."
                : validationError
                ? validationError
                : "JSON parses cleanly — ready to save."}
            </p>
            {isSelectedSecret ? (
              <label className="field field-full audit-confirmation">
                <input
                  type="checkbox"
                  checked={auditConfirmed}
                  onChange={(event) => setAuditConfirmed(event.target.checked)}
                />
                <span>
                  I confirm this change to a sensitive setting will be recorded in the audit log.
                </span>
              </label>
            ) : null}
            <button className="button button-primary" type="submit" disabled={saveDisabled}>
              <Save aria-hidden="true" size={16} />
              Save
            </button>
          </form>
          {saveMutation.isError ? <ErrorState error={saveMutation.error} title="Save failed" /> : null}
          {saveMutation.isSuccess ? <p className="success-text">Setting saved.</p> : null}
        </section>
      </div>
    </div>
  );
}

function groupSettings(settings: Setting[]): Record<string, Setting[]> {
  return settings.reduce<Record<string, Setting[]>>((groups, setting) => {
    const group = setting.key.includes(".") ? setting.key.split(".")[0] : "general";
    groups[group] = [...(groups[group] ?? []), setting];
    return groups;
  }, {});
}
