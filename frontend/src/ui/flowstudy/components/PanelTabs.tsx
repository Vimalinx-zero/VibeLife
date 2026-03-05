export type PanelTabKey = string;

export type PanelTab<T extends PanelTabKey = PanelTabKey> = {
  key: T;
  label: string;
  icon?: string;
};

export interface PanelTabsProps<T extends PanelTabKey = PanelTabKey> {
  tabs: Array<PanelTab<T>>;
  activeKey: T;
  onChange: (next: T) => void;
  hintText?: string;
}

export function PanelTabs<T extends PanelTabKey>({ tabs, activeKey, onChange, hintText }: PanelTabsProps<T>) {
  return (
    <div className="flex flex-col">
      <div className="flex items-center gap-2">
        {tabs.map((t) => {
          const active = t.key === activeKey;
          return (
            <button
              key={t.key}
              type="button"
              onClick={() => onChange(t.key)}
              className={`flex-1 px-4 py-2 text-xs font-medium rounded-lg transition-all flex items-center justify-center gap-2 cursor-pointer select-none active:scale-95 ${
                active
                  ? "bg-purple-500 text-white shadow-lg shadow-purple-500/30"
                  : "text-gray-600 dark:text-gray-400 hover:bg-gray-200/50 dark:hover:bg-white/10"
              }`}
            >
              {t.icon ? <span aria-hidden>{t.icon}</span> : null}
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {hintText ? (
        <div className="mt-2 flex items-center justify-center">
          <span className="text-[9px] text-gray-400 dark:text-gray-500">{hintText}</span>
        </div>
      ) : null}
    </div>
  );
}
