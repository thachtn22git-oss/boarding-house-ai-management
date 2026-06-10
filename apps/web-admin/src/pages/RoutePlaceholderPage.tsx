import PlaceholderPage from '../components/common/PlaceholderPage'
import { getPageByPath } from '../config/navigation'

type RoutePlaceholderPageProps = {
  path: string
}

function RoutePlaceholderPage({ path }: RoutePlaceholderPageProps) {
  const page = getPageByPath(path)

  return (
    <PlaceholderPage
      description={`${page.label} tools and records will be available here.`}
      label={page.portalLabel}
    />
  )
}

export default RoutePlaceholderPage
