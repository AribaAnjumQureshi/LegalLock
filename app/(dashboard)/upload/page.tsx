import { Topbar } from '@/components/topbar'
import { DocumentUploader } from '@/components/document-uploader'

export default function UploadPage() {
  return (
    <>
      <Topbar breadcrumb="Home / Documents / Upload" title="Submit Document to Custody" />

      <main className="flex-1 p-6">
        <div className="mx-auto max-w-2xl">
          <DocumentUploader />
        </div>
      </main>
    </>
  )
}
