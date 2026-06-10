import { appLabels } from '../../config/navigation'

type PlaceholderPageProps = {
  description: string
  label?: string
}

function PlaceholderPage({
  description,
  label = appLabels.ownerPortal,
}: PlaceholderPageProps) {
  return (
    <section className="page-placeholder">
      <div className="page-placeholder-card">
        <p className="page-eyebrow">{label}</p>
        <p>{description}</p>
      </div>
    </section>
  )
}

export default PlaceholderPage
