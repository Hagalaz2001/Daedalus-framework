import type { LinkComponent } from '@app/ui'
import { Link } from 'react-router'

/** Adapts react-router's Link to the kit's `linkAs` prop (AppShell). */
export const RouterLink: LinkComponent = ({ href, ...props }) => <Link to={href} {...props} />
