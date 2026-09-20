type ThemeMode = "light" | "dark";

const THEME_KEY = "meowxel-theme";

export function useTheme() {
  const theme = useState<ThemeMode>("meowxel-theme-mode", () => "light");
  const initialized = useState("meowxel-theme-initialized", () => false);

  function applyTheme() {
    if (!import.meta.client) return;
    document.documentElement.classList.toggle("dark", theme.value === "dark");
    document.documentElement.style.colorScheme = theme.value;
  }

  function init() {
    if (!import.meta.client || initialized.value) return;
    const saved = localStorage.getItem(THEME_KEY);
    if (saved === "light" || saved === "dark") theme.value = saved;
    applyTheme();
    initialized.value = true;
  }

  function toggle() {
    theme.value = theme.value === "light" ? "dark" : "light";
    applyTheme();
    localStorage.setItem(THEME_KEY, theme.value);
  }

  return { theme, init, toggle };
}
