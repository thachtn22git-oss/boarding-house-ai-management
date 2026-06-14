import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
  onSnapshot,
  orderBy,
  query,
  serverTimestamp,
  updateDoc,
  where,
} from 'firebase/firestore'

import { db } from '../../../config/firebase'
import type { Contract, ContractFormValues } from '../types'

const contractsCollection = collection(db, 'contracts')

function mapContractDocument(
  documentId: string,
  data: Record<string, unknown>,
): Contract {
  return {
    id: documentId,
    ownerId: String(data.ownerId ?? ''),
    tenantId: String(data.tenantId ?? ''),
    roomId: String(data.roomId ?? ''),
    contractCode: String(data.contractCode ?? ''),
    startDate: String(data.startDate ?? ''),
    endDate: String(data.endDate ?? ''),
    monthlyRent: Number(data.monthlyRent ?? 0),
    deposit: Number(data.deposit ?? 0),
    paymentDueDay: Number(data.paymentDueDay ?? 1),
    status:
      data.status === 'expired' ||
      data.status === 'terminated' ||
      data.status === 'pending'
        ? data.status
        : 'active',
    terms: typeof data.terms === 'string' ? data.terms : undefined,
    createdAt: data.createdAt,
    updatedAt: data.updatedAt,
  }
}

async function getContractsFromQuery(ownerId: string, sortByCreatedAt: boolean) {
  const contractsQuery = sortByCreatedAt
    ? query(
        contractsCollection,
        where('ownerId', '==', ownerId),
        orderBy('createdAt', 'desc'),
      )
    : query(contractsCollection, where('ownerId', '==', ownerId))
  const snapshot = await getDocs(contractsQuery)

  return snapshot.docs.map((contractDoc) =>
    mapContractDocument(contractDoc.id, contractDoc.data()),
  )
}

function getTimestampValue(value: unknown) {
  if (typeof value === 'object' && value !== null && 'toDate' in value) {
    return (value as { toDate: () => Date }).toDate().getTime()
  }

  if (typeof value === 'string') {
    const time = new Date(value).getTime()
    return Number.isNaN(time) ? 0 : time
  }

  return 0
}

function sortContractsByCreatedAt(contracts: Contract[]) {
  return [...contracts].sort(
    (left, right) =>
      getTimestampValue(right.createdAt) - getTimestampValue(left.createdAt),
  )
}

export async function getContractsByOwner(
  ownerId: string,
): Promise<Contract[]> {
  try {
    return await getContractsFromQuery(ownerId, true)
  } catch {
    return getContractsFromQuery(ownerId, false)
  }
}

function subscribeContractsByField(
  field: 'ownerId' | 'tenantId',
  value: string,
  callback: (contracts: Contract[]) => void,
  onError?: (error: unknown) => void,
  label = 'contracts',
): () => void {
  const unsubscribe = onSnapshot(
    query(contractsCollection, where(field, '==', value)),
    (snapshot) => {
      const contracts = sortContractsByCreatedAt(
        snapshot.docs.map((contractDoc) =>
          mapContractDocument(contractDoc.id, contractDoc.data()),
        ),
      )
      if (import.meta.env.DEV) {
        console.debug(`${label} snapshot`, {
          collection: 'contracts',
          field,
          value,
          size: contracts.length,
        })
      }
      callback(contracts)
    },
    (error) => {
      console.warn(`Realtime ${label} subscription failed.`, {
        collection: 'contracts',
        field,
        value,
        code: 'code' in error ? error.code : undefined,
        message: error.message,
      })
      const fallback =
        field === 'ownerId'
          ? getContractsByOwner(value)
          : getDocs(query(contractsCollection, where(field, '==', value))).then((snapshot) =>
              sortContractsByCreatedAt(
                snapshot.docs.map((contractDoc) =>
                  mapContractDocument(contractDoc.id, contractDoc.data()),
                ),
              ),
            )
      void fallback.then(callback).catch((fallbackError) => {
        console.warn(`${label} fallback fetch failed.`, fallbackError)
      })
      onError?.(error)
    },
  )

  if (import.meta.env.DEV) {
    console.debug(`Subscribed to ${label}`)
  }

  return () => {
    unsubscribe()
    if (import.meta.env.DEV) {
      console.debug(`Unsubscribed from ${label}`)
    }
  }
}

export function subscribeOwnerContracts(
  ownerId: string,
  callback: (contracts: Contract[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return subscribeContractsByField('ownerId', ownerId, callback, onError, 'owner contracts')
}

export function subscribeTenantContracts(
  tenantId: string,
  callback: (contracts: Contract[]) => void,
  onError?: (error: unknown) => void,
): () => void {
  return subscribeContractsByField('tenantId', tenantId, callback, onError, 'tenant contracts')
}

export async function createContract(
  ownerId: string,
  values: ContractFormValues,
): Promise<string> {
  const contractRef = await addDoc(contractsCollection, {
    ...values,
    ownerId,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  })

  return contractRef.id
}

export async function updateContract(
  contractId: string,
  values: Partial<ContractFormValues>,
): Promise<void> {
  await updateDoc(doc(db, 'contracts', contractId), {
    ...values,
    updatedAt: serverTimestamp(),
  })
}

export async function deleteContract(contractId: string): Promise<void> {
  await deleteDoc(doc(db, 'contracts', contractId))
}
