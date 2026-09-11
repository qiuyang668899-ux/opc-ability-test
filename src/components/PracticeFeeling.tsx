export default function PracticeFeeling({ value, onChange, phase }: { value: number | null; onChange: (value: number) => void; phase: 'before' | 'after' }) {
  return <fieldset className="practice-feeling">
    <legend>{phase === 'before' ? '开始前，此刻身心舒适吗？' : '现在，身心舒适一些了吗？'} <small>选填</small></legend>
    <div>{['很不适', '有些紧', '一般', '较舒适', '很舒适'].map((label, index) => <button key={label} type="button" aria-pressed={value === index + 1} onClick={() => onChange(index + 1)}><strong>{index + 1}</strong><span>{label}</span></button>)}</div>
    <p>{phase === 'before' ? '凭直觉点一下，结束时和自己比较，不与他人比较。' : '没变化也有价值。只记录你的感受，不代表医学效果。'}</p>
  </fieldset>
}
