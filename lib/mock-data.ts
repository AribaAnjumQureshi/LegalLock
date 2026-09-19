export type Role = 'Admin' | 'Officer' | 'Lawyer'
export type Classification = 'Unclassified' | 'Restricted' | 'Confidential'
export type DocType = 'Evidence' | 'Report' | 'Warrant' | 'Statement' | 'Affidavit'
export type DocStatus = 'Sealed' | 'In Review' | 'Released' | 'Archived'

export interface CurrentUser {
  id: string
  username: string
  email: string
  full_name: string
  role: Role
}

export interface DocumentRecord {
  id: string
  title: string
  caseId: string
  type: DocType
  classification: Classification
  status: DocStatus
  owner: string
  ownerRole: Role
  size: string
  updated: string
  sha: string
}

export type ActivityAction =
  | 'Login' | 'Upload' | 'Download' | 'View' | 'Seal' | 'Release'
  | 'Delete' | 'Permission Change' | 'Access Request' | 'Access Denied'
  | 'Version Created'

export interface ActivityEntry {
  id: string
  timestamp: string
  actor: string
  actorRole: Role
  action: ActivityAction
  target: string
  caseId: string
  ip: string
  result: 'Success' | 'Denied'
}

export const caseIds: string[] = []
export const docTypes: DocType[] = ['Evidence', 'Report', 'Warrant', 'Statement', 'Affidavit']
