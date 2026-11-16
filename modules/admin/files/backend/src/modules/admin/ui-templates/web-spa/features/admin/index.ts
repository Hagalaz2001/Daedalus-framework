// Public surface of the admin feature. Wire it in app/routes.tsx:
//   <Route path="/admin" element={<AdminScreen />} />   (inside the signed-in routes)
// and add { href: '/admin', label: 'Admin', icon: Database } to `nav` for administrators.
export { AdminScreen } from "./ui/AdminScreen";
