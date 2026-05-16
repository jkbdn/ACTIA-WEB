/* ACTIA — Tweaks panel */
const { useEffect } = React;

const ACCENT_MAP = {
  '#F0A000': 'default',
  '#F5D414': 'yellow',
  '#E3B046': 'amber',
  '#6BA77F': 'verde',
  '#FF4D2E': 'signal',
};

function ActiaTweaks() {
  const [t, setTweak] = useTweaks(TWEAK_DEFAULS);

  useEffect(() => {
    const accentKey = ACCENT_MAP[t.accent] || 'default';
    document.body.setAttribute('data-accent', accentKey);
    document.body.setAttribute('data-density', t.density || 'default');
    document.body.classList.toggle('hide-hud', !t.showHud);
  }, [t.accent, t.density, t.showHud]);

  return (
    <TweaksPanel title="ACTIA OS · Tweaks">
      <TweakSection label="Color de acento">
        <TweakColor
          label="Línea de energía"
          value={t.accent}
          onChange={(v) => setTweak('accent', v)}
          options={['#F0A000', '#F5D414', '#E3B046', '#6BA77F', '#FF4D2E']}
        />
      </TweakSection>

      <TweakSection label="Densidad">
        <TweakRadio
          label="Ritmo vertical"
          value={t.density}
          onChange={(v) => setTweak('density', v)}
          options={[
            { value: 'dense', label: 'Dense' },
            { value: 'default', label: 'Standard' },
            { value: 'comfortable', label: 'Comfort' },
          ]}
        />
      </TweakSection>

      <TweakSection label="HUD industrial">
        <TweakToggle
          label="Mostrar coordenadas y marcas"
          value={t.showHud}
          onChange={(v) => setTweak('showHud', v)}
        />
      </TweakSection>
    </TweaksPanel>
  );
}

const _tw = document.createElement('div');
_tw.id = 'tweaks-root';
document.body.appendChild(_tw);
ReactDOM.createRoot(_tw).render(<ActiaTweaks />);
