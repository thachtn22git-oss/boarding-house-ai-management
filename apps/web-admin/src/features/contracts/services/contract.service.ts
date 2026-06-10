import {
  addDoc,
  collection,
  deleteDoc,
  doc,
  getDocs,
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

export async function getContractsByOwner(
  ownerId: string,
): Promise<Contract[]> {
  try {
    return await getContractsFromQuery(ownerId, true)
  } catch {
    return getContractsFromQuery(ownerId, false)
  }
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
