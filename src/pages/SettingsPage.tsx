import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { type FormEvent, useMemo, useState } from "react";
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

export function SettingsPage() {
  const queryClient = useQueryClient();
  const [selectedKey, setSelectedKey] = useState("");
  const [rawValue, setRawValue] = useState("");
  const [validationError, setValidationError] = useState("");
  const settingsQuery = useQuery({
    queryKey: ["settings"],
    queryFn: fetchSettings,
    retry: false,
  });
  const saveMutation = useMutation({
    mutationFn: ({ key, value }: { key: string; value: unknown }) => saveSetting(key, value),
    onSuccess: async () => {
      setValidationError("");
      await queryClient.invalidateQueries({ queryKey: ["settings"] });
    },
  });

  const grouped = useMemo(() => groupSettings(settingsQuery.data?.items ?? []), [settingsQuery.data]);
  const isSelectedSecret = selectedKey.trim() !== "" && isSecretSetting(selectedKey);
  const secretReplacementMissing = isSelectedSecret && rawValue.trim() === "";

  function startEdit(setting: Setting) {
    setSelectedKey(setting.key);
    setRawValue(isSecretSetting(setting.key) ? "" : JSON.stringify(setting.value, null, 2));
    setValidationError("");
  }

  function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (selectedKey.trim() === "") return;
    if (secretReplacementMissing) {
      setValidationError("Secret replacement is required.");
      return;
    }
    try {
      const value = rawValue.trim() === "" ? "" : (JSON.parse(rawValue) as unknown);
      saveMutation.mutate({ key: selectedKey.trim(), value });
    } catch {
      setValidationError("Value must be valid JSON.");
    }
  }

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
                onChange={(event) => setRawValue(event.target.value)}
              />
            </label>
            <button
              className="button button-primary"
              type="submit"
              disabled={
                selectedKey.trim() === "" ||
                secretReplacementMissing ||
                saveMutation.isPending
              }
            >
              <Save aria-hidden="true" size={16} />
              Save
            </button>
          </form>
          {validationError ? (
            <div className="state-panel state-panel-error" role="alert">
              <h2>Invalid setting value</h2>
              <p>{validationError}</p>
            </div>
          ) : null}
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
