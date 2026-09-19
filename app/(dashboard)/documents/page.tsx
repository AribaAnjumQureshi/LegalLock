'use client'

import { Topbar } from '@/components/topbar'
import { DocumentTable } from '@/components/document-table'

export default function DocumentsPage() {
  return (
    <>
      <Topbar breadcrumb="Home / Documents" title="Document Registry" />
      <main className="flex-1 p-6"><DocumentTable /></main>
    </>
  )
}
