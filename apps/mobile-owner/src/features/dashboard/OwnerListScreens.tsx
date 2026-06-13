import { useCallback, useEffect, useMemo, useState } from 'react'
import * as Clipboard from 'expo-clipboard'
import { Alert, Modal, ScrollView, StyleSheet, Text, View } from 'react-native'
import { useAuth } from '../../providers/AuthProvider'
import { Screen } from '../../components/common/Screen'
import { ListCard } from '../../components/cards/ListCard'
import { PrimaryButton } from '../../components/common/PrimaryButton'
import { FormInput } from '../../components/common/FormInput'
import { FormSelect, type SelectOption } from '../../components/common/FormSelect'
import { StatusBadge } from '../../components/common/StatusBadge'
import { confirmAction } from '../../components/common/ConfirmDialog'
import { colors, spacing } from '../../constants/theme'
import {
  confirmUtilityReading,
  createInvoice,
  createRoom,
  createTenant,
  createUtilityReading,
  deleteInvoice,
  deleteRoom,
  deleteTenant,
  deleteUtilityReading,
  getContracts,
  getFeedback,
  getInvoices,
  getRooms,
  getTenants,
  getTenantsWithRooms,
  getUtilities,
  markFeedbackAsInReview,
  markInvoiceAsPaid,
  markUtilityReadingAsBilled,
  rejectFeedback,
  resolveFeedback,
  simulateOwnerUtilityVietQRCallback,
  simulateOwnerVietQRCallback,
  updateInvoice,
  updateRoom,
  updateTenant,
  updateUtilityReading,
} from '../../services/ownerData.service'
import type {
  Contract,
  Feedback,
  Invoice,
  InvoiceFormValues,
  InvoiceItem,
  InvoiceStatus,
  Room,
  RoomFormValues,
  RoomStatus,
  Tenant,
  TenantFormValues,
  TenantStatus,
  TenantWithRoom,
  UtilityReading,
  UtilityReadingFormValues,
  UtilityReadingStatus,
  UtilityType,
} from '../../types/models'
import { formatCurrency, formatDate } from '../../utils/format'

function getFeedbackRecommendation(feedback: Feedback) {
  const text = `${feedback.title} ${feedback.content ?? ''} ${feedback.aiSuggestedCategory ?? feedback.category ?? ''}`.toLowerCase()

  if (feedback.aiSuggestedResolution || feedback.aiSuggestedReply) {
    return {
      suggestedResolution:
        feedback.aiSuggestedResolution ??
        'Review the feedback and determine appropriate action based on the reported issue.',
      suggestedReply:
        feedback.aiSuggestedReply ??
        'Thank you for your feedback. We will review the issue and follow up accordingly.',
    }
  }

  if (['leak', 'water', 'pipe', 'bathroom', 'toilet', 'door', 'window', 'broken', 'repair'].some((keyword) => text.includes(keyword))) {
    return {
      suggestedResolution:
        'Inspect the reported issue and schedule maintenance as soon as possible. Verify the affected equipment and replace damaged parts if necessary.',
      suggestedReply:
        'Thank you for reporting this issue. We will arrange maintenance staff to inspect and resolve it as soon as possible.',
    }
  }
  if (['wifi', 'internet', 'network', 'signal', 'slow internet'].some((keyword) => text.includes(keyword))) {
    return {
      suggestedResolution:
        'Check router status, internet connection quality, and signal strength in the affected room. Restart networking equipment if necessary.',
      suggestedReply:
        'Thank you for your feedback. We will inspect the network equipment and internet connection quality shortly.',
    }
  }
  if (['electricity', 'power', 'light', 'socket', 'switch'].some((keyword) => text.includes(keyword))) {
    return {
      suggestedResolution:
        'Inspect electrical equipment and verify power supply stability. Schedule an electrician if required.',
      suggestedReply:
        'Thank you for reporting this issue. We will inspect the electrical system and address the problem promptly.',
    }
  }
  if (['security', 'theft', 'suspicious', 'unsafe'].some((keyword) => text.includes(keyword))) {
    return {
      suggestedResolution:
        'Review security records, inspect relevant areas, and take immediate preventive measures.',
      suggestedReply:
        'Thank you for reporting this concern. We take security seriously and will investigate immediately.',
    }
  }

  return {
    suggestedResolution:
      'Review the feedback and determine appropriate action based on the reported issue.',
    suggestedReply:
      'Thank you for your feedback. We will review the issue and follow up accordingly.',
  }
}

type Loader<T> = (ownerId: string) => Promise<T[]>

interface DataListScreenProps<T> {
  title: string
  subtitle: string
  emptyMessage: string
  loader: Loader<T>
  actionLabel?: string
  onAction?: () => void
  refreshKey?: number
  renderItem: (item: T, reload: () => Promise<void>) => React.ReactNode
}

const roomStatusOptions: SelectOption[] = [
  { label: 'Available', value: 'available' },
  { label: 'Occupied', value: 'occupied' },
  { label: 'Maintenance', value: 'maintenance' },
]

const tenantStatusOptions: SelectOption[] = [
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
  { label: 'Pending', value: 'pending' },
]

const invoiceStatusOptions: SelectOption[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Unpaid', value: 'unpaid' },
  { label: 'Paid', value: 'paid' },
  { label: 'Overdue', value: 'overdue' },
  { label: 'Cancelled', value: 'cancelled' },
]

const utilityTypeOptions: SelectOption[] = [
  { label: 'Electricity', value: 'electricity' },
  { label: 'Water', value: 'water' },
]

const utilityStatusOptions: SelectOption[] = [
  { label: 'Draft', value: 'draft' },
  { label: 'Confirmed', value: 'confirmed' },
  { label: 'Billed', value: 'billed' },
  { label: 'Paid', value: 'paid' },
]

function DataListScreen<T extends { id: string }>({
  title,
  subtitle,
  emptyMessage,
  loader,
  actionLabel,
  onAction,
  refreshKey,
  renderItem,
}: DataListScreenProps<T>) {
  const { currentUser } = useAuth()
  const [items, setItems] = useState<T[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const loadItems = useCallback(async () => {
    if (!currentUser) return

    setLoading(true)
    setError(null)

    try {
      setItems(await loader(currentUser.uid))
    } catch (loadError) {
      console.warn(`${title} load failed.`, loadError)
      setError('Unable to load data.')
    } finally {
      setLoading(false)
    }
  }, [currentUser, loader, title])

  useEffect(() => {
    void loadItems()
  }, [loadItems, refreshKey])

  return (
    <Screen loading={loading} onRefresh={loadItems} refreshing={loading} subtitle={subtitle} title={title}>
      {error ? <Text style={styles.error}>{error}</Text> : null}
      {actionLabel && onAction ? <PrimaryButton label={actionLabel} onPress={onAction} /> : null}
      {!items.length && !error ? <Text style={styles.empty}>{emptyMessage}</Text> : null}
      {items.map((item) => (
        <ListCard key={item.id} title="Details">
          {renderItem(item, loadItems)}
        </ListCard>
      ))}
    </Screen>
  )
}

export function RoomsScreen() {
  const { currentUser } = useAuth()
  const [modalVisible, setModalVisible] = useState(false)
  const [editingRoom, setEditingRoom] = useState<Room | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  return (
    <>
      <DataListScreen<Room>
        actionLabel="Add Room"
        emptyMessage="No rooms found."
        loader={getRooms}
        onAction={() => {
          setEditingRoom(null)
          setModalVisible(true)
        }}
        refreshKey={refreshKey}
        renderItem={(room, reload) => (
          <View style={styles.item}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>Room {room.roomNumber}</Text>
              <StatusBadge label={formatLabel(room.status)} tone={statusTone(room.status)} />
            </View>
            <Text style={styles.meta}>Type: {room.roomType}</Text>
            <Text style={styles.meta}>Price: {formatCurrency(room.price)}</Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Edit"
                onPress={() => {
                  setEditingRoom(room)
                  setModalVisible(true)
                }}
                variant="secondary"
              />
              <PrimaryButton
                label="Delete"
                onPress={() =>
                  confirmAction('Delete Room', 'This action cannot be undone.', () => {
                    void deleteRoom(room.id).then(reload)
                  })
                }
                variant="danger"
              />
            </View>
          </View>
        )}
        subtitle="Rooms scoped to your owner account."
        title="Rooms"
      />
      <RoomFormModal
        room={editingRoom}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          setModalVisible(false)
          setRefreshKey((value) => value + 1)
        }}
        ownerId={currentUser?.uid}
      />
    </>
  )
}

export function TenantsScreen() {
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingTenant, setEditingTenant] = useState<TenantWithRoom | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadRooms = useCallback(async () => {
    if (!currentUser) return
    setRooms(await getRooms(currentUser.uid))
  }, [currentUser])

  useEffect(() => {
    void loadRooms()
  }, [loadRooms])

  return (
    <>
      <DataListScreen<TenantWithRoom>
        actionLabel="Add Tenant"
        emptyMessage="No tenants found."
        loader={getTenantsWithRooms}
        onAction={() => {
          setEditingTenant(null)
          setModalVisible(true)
        }}
        refreshKey={refreshKey}
        renderItem={(tenant, reload) => (
          <View style={styles.item}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{tenant.fullName}</Text>
              <StatusBadge label={formatLabel(tenant.status)} tone={statusTone(tenant.status)} />
            </View>
            <Text style={styles.meta}>Phone: {tenant.phone || 'Not available'}</Text>
            <Text style={styles.meta}>
              Room: {tenant.room ? `${tenant.room.roomNumber} - ${tenant.room.roomType}` : 'Not assigned'}
            </Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Edit"
                onPress={() => {
                  setEditingTenant(tenant)
                  setModalVisible(true)
                }}
                variant="secondary"
              />
              <PrimaryButton
                label="Delete"
                onPress={() =>
                  confirmAction('Delete Tenant', 'This action cannot be undone.', () => {
                    void deleteTenant(tenant.id).then(reload)
                  })
                }
                variant="danger"
              />
            </View>
          </View>
        )}
        subtitle="Tenant records for your boarding house."
        title="Tenants"
      />
      <TenantFormModal
        ownerId={currentUser?.uid}
        rooms={rooms}
        tenant={editingTenant}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          setModalVisible(false)
          setRefreshKey((value) => value + 1)
          void loadRooms()
        }}
      />
    </>
  )
}

export function InvoicesScreen() {
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingInvoice, setEditingInvoice] = useState<Invoice | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadRelated = useCallback(async () => {
    if (!currentUser) return
    const [ownerRooms, ownerTenants] = await Promise.all([getRooms(currentUser.uid), getTenants(currentUser.uid)])
    setRooms(ownerRooms)
    setTenants(ownerTenants)
  }, [currentUser])

  useEffect(() => {
    void loadRelated()
  }, [loadRelated])

  return (
    <>
      <DataListScreen<Invoice>
        actionLabel="Create Invoice"
        emptyMessage="No invoices found."
        loader={getInvoices}
        onAction={() => {
          setEditingInvoice(null)
          setModalVisible(true)
        }}
        refreshKey={refreshKey}
        renderItem={(invoice, reload) => (
          <View style={styles.item}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{invoice.invoiceCode}</Text>
              <StatusBadge label={formatLabel(invoice.status)} tone={statusTone(invoice.status)} />
            </View>
            <Text style={styles.meta}>Billing Month: {invoice.billingMonth}</Text>
            <Text style={styles.meta}>Total Amount: {formatCurrency(invoice.totalAmount)}</Text>
            <Text style={styles.meta}>Remaining: {formatCurrency((invoice.totalAmount ?? 0) - (invoice.paidAmount ?? 0))}</Text>
            <Text style={styles.meta}>Payment Status: {invoice.paymentStatus ?? (invoice.status === 'paid' ? 'paid' : 'unpaid')}</Text>
            <Text style={styles.meta}>Payment Method: {invoice.paymentMethod ?? 'Not available'}</Text>
            <Text style={styles.meta}>Payment Reference: {invoice.paymentReference ?? 'Not available'}</Text>
            <Text style={styles.meta}>Paid Amount: {formatCurrency(invoice.paidAmount)}</Text>
            <Text style={styles.meta}>Paid At: {formatDate(invoice.paidAt)}</Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Edit"
                onPress={() => {
                  setEditingInvoice(invoice)
                  setModalVisible(true)
                }}
                variant="secondary"
              />
              {invoice.status !== 'paid' ? (
                <PrimaryButton label="Mark Paid" onPress={() => void markInvoiceAsPaid(invoice).then(reload)} />
              ) : null}
              {__DEV__ && invoice.status !== 'paid' ? (
                <PrimaryButton
                  label="Simulate VietQR Callback"
                  onPress={() => {
                    const tenant = tenants.find((item) => item.id === invoice.tenantId)
                    void simulateOwnerVietQRCallback(invoice, tenant?.fullName ?? 'Tenant')
                      .then(reload)
                      .then(() => Alert.alert('Demo VietQR', 'Demo VietQR callback processed successfully.'))
                  }}
                  variant="secondary"
                />
              ) : null}
              <PrimaryButton
                label="Delete"
                onPress={() =>
                  confirmAction('Delete Invoice', 'This action cannot be undone.', () => {
                    void deleteInvoice(invoice.id).then(reload)
                  })
                }
                variant="danger"
              />
            </View>
          </View>
        )}
        subtitle="Track invoice status and amounts."
        title="Invoices"
      />
      <InvoiceFormModal
        invoice={editingInvoice}
        ownerId={currentUser?.uid}
        rooms={rooms}
        tenants={tenants}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          setModalVisible(false)
          setRefreshKey((value) => value + 1)
        }}
      />
    </>
  )
}

export function ContractsScreen() {
  return (
    <DataListScreen<Contract>
      emptyMessage="No contracts found."
      loader={getContracts}
      renderItem={(contract) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{contract.contractCode}</Text>
          <Text style={styles.meta}>End Date: {contract.endDate}</Text>
          <StatusBadge label={formatLabel(contract.status)} tone={statusTone(contract.status)} />
        </View>
      )}
      subtitle="Review active and pending contracts."
      title="Contracts"
    />
  )
}

export function UtilitiesScreen() {
  const { currentUser } = useAuth()
  const [rooms, setRooms] = useState<Room[]>([])
  const [tenants, setTenants] = useState<Tenant[]>([])
  const [modalVisible, setModalVisible] = useState(false)
  const [editingReading, setEditingReading] = useState<UtilityReading | null>(null)
  const [refreshKey, setRefreshKey] = useState(0)

  const loadRelated = useCallback(async () => {
    if (!currentUser) return
    const [ownerRooms, ownerTenants] = await Promise.all([getRooms(currentUser.uid), getTenants(currentUser.uid)])
    setRooms(ownerRooms)
    setTenants(ownerTenants)
  }, [currentUser])

  useEffect(() => {
    void loadRelated()
  }, [loadRelated])

  return (
    <>
      <DataListScreen<UtilityReading>
        actionLabel="Add Reading"
        emptyMessage="No utility readings found."
        loader={getUtilities}
        onAction={() => {
          setEditingReading(null)
          setModalVisible(true)
        }}
        refreshKey={refreshKey}
        renderItem={(reading, reload) => (
          <View style={styles.item}>
            <View style={styles.rowBetween}>
              <Text style={styles.itemTitle}>{formatLabel(reading.utilityType)}</Text>
              <StatusBadge
                label={formatLabel(getUtilityDisplayStatus(reading))}
                tone={statusTone(getUtilityDisplayStatus(reading))}
              />
            </View>
            <Text style={styles.meta}>Billing Month: {reading.billingMonth}</Text>
            <Text style={styles.meta}>Usage: {reading.usage}</Text>
            <Text style={styles.meta}>Total Amount: {formatCurrency(reading.totalAmount)}</Text>
            <Text style={styles.meta}>Payment Status: {reading.paymentStatus ?? (reading.status === 'paid' || reading.status === 'billed_paid' ? 'paid' : 'unpaid')}</Text>
            <Text style={styles.meta}>Payment Method: {reading.paymentMethod ?? 'Not available'}</Text>
            <Text style={styles.meta}>Payment Reference: {reading.paymentReference ?? 'Not available'}</Text>
            <Text style={styles.meta}>Paid Amount: {formatCurrency(reading.paidAmount)}</Text>
            <Text style={styles.meta}>Paid At: {formatDate(reading.paidAt)}</Text>
            <View style={styles.actions}>
              <PrimaryButton
                label="Edit"
                onPress={() => {
                  setEditingReading(reading)
                  setModalVisible(true)
                }}
                variant="secondary"
              />
              {reading.status === 'draft' ? (
                <PrimaryButton label="Confirm" onPress={() => void confirmUtilityReading(reading.id).then(reload)} />
              ) : null}
              {reading.status === 'confirmed' ? (
                <PrimaryButton label="Mark Billed" onPress={() => void markUtilityReadingAsBilled(reading.id).then(reload)} />
              ) : null}
              {__DEV__ && (reading.paymentStatus ?? (reading.status === 'paid' || reading.status === 'billed_paid' ? 'paid' : 'unpaid')) !== 'paid' ? (
                <PrimaryButton
                  label="Simulate VietQR Callback"
                  onPress={() => {
                    const room = rooms.find((item) => item.id === reading.roomId)
                    const tenant = reading.tenantId ? tenants.find((item) => item.id === reading.tenantId) : undefined
                    void simulateOwnerUtilityVietQRCallback(reading, tenant?.fullName ?? 'Tenant', room?.roomNumber)
                      .then(reload)
                      .then(() => Alert.alert('Demo VietQR', 'Demo VietQR utility callback processed successfully.'))
                  }}
                  variant="secondary"
                />
              ) : null}
              <PrimaryButton
                label="Delete"
                onPress={() =>
                  confirmAction('Delete Reading', 'This action cannot be undone.', () => {
                    void deleteUtilityReading(reading.id).then(reload)
                  })
                }
                variant="danger"
              />
            </View>
          </View>
        )}
        subtitle="Review electricity and water readings."
        title="Utilities"
      />
      <UtilityFormModal
        ownerId={currentUser?.uid}
        reading={editingReading}
        rooms={rooms}
        tenants={tenants}
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        onSaved={() => {
          setModalVisible(false)
          setRefreshKey((value) => value + 1)
        }}
      />
    </>
  )
}

export function FeedbackScreen() {
  return (
    <DataListScreen<Feedback>
      emptyMessage="No feedback found."
      loader={getFeedback}
      renderItem={(feedback, reload) => (
        <View style={styles.item}>
          <Text style={styles.itemTitle}>{feedback.title}</Text>
          <Text style={styles.meta}>Category: {formatAiCategory(feedback)}</Text>
          <Text style={styles.meta}>AI Priority: {formatAiPriority(feedback)}</Text>
          <Text style={styles.meta}>AI Sentiment: {formatAiLabel(feedback.sentiment)}</Text>
          <Text style={styles.meta} numberOfLines={1}>
            Suggested: {getFeedbackRecommendation(feedback).suggestedResolution}
          </Text>
          <StatusBadge label={formatLabel(feedback.status)} tone={statusTone(feedback.status)} />
          <View style={styles.actions}>
            <PrimaryButton
              label="View"
              onPress={() =>
                Alert.alert(feedback.title, [
                  feedback.content || 'No content available.',
                  feedback.ownerResponse ? `\nOwner Response: ${feedback.ownerResponse}` : '',
                  '\nAI Analysis',
                  `Sentiment: ${formatAiLabel(feedback.sentiment)}`,
                  `Category: ${formatAiCategory(feedback)}`,
                  `Priority: ${formatAiPriority(feedback)}`,
                  `Summary: ${feedback.aiSummary ?? 'AI summary will be generated after analysis.'}`,
                  '\nAI Suggested Resolution',
                  getFeedbackRecommendation(feedback).suggestedResolution,
                  '\nAI Suggested Reply',
                  getFeedbackRecommendation(feedback).suggestedReply,
                  `Category Confidence: ${formatConfidence(feedback.aiConfidence?.category)}`,
                  `Sentiment Confidence: ${formatConfidence(feedback.aiConfidence?.sentiment)}`,
                  `Priority Confidence: ${formatConfidence(feedback.aiConfidence?.priority)}`,
                  `AI Error: ${feedback.aiError ?? 'Not available'}`,
                ].join(''))
              }
              variant="secondary"
            />
            <PrimaryButton
              label="Copy Reply"
              onPress={() => {
                void Clipboard.setStringAsync(getFeedbackRecommendation(feedback).suggestedReply)
                Alert.alert('Copied', 'Suggested reply copied to clipboard.')
              }}
              variant="secondary"
            />
            {feedback.status === 'new' ? (
              <PrimaryButton label="In Review" onPress={() => void markFeedbackAsInReview(feedback.id).then(reload)} />
            ) : null}
            {feedback.status === 'new' || feedback.status === 'in_review' ? (
              <>
                <PrimaryButton label="Resolve" onPress={() => askOwnerResponse('Resolve Feedback', (response) => void resolveFeedback(feedback, response).then(reload))} />
                <PrimaryButton label="Reject" onPress={() => askOwnerResponse('Reject Feedback', (response) => void rejectFeedback(feedback, response).then(reload))} variant="danger" />
              </>
            ) : null}
          </View>
        </View>
      )}
      subtitle="Review tenant feedback and priorities."
      title="Feedback"
    />
  )
}

interface BaseModalProps {
  visible: boolean
  onClose: () => void
  onSaved: () => void
  ownerId?: string
}

function RoomFormModal({ visible, onClose, onSaved, ownerId, room }: BaseModalProps & { room: Room | null }) {
  const [values, setValues] = useState<RoomFormValues>(getInitialRoomValues(room))
  const [saving, setSaving] = useState(false)
  const totalLabel = room ? 'Update Room' : 'Create Room'

  useEffect(() => {
    setValues(getInitialRoomValues(room))
  }, [room, visible])

  async function save() {
    if (!ownerId) return
    if (!values.roomNumber.trim()) return Alert.alert('Validation Error', 'Room number is required.')
    if (values.price <= 0) return Alert.alert('Validation Error', 'Price must be greater than 0.')
    if (values.area <= 0) return Alert.alert('Validation Error', 'Area must be greater than 0.')
    if (values.maxTenants <= 0) return Alert.alert('Validation Error', 'Max tenants must be greater than 0.')

    setSaving(true)
    try {
      if (room) await updateRoom(room.id, values)
      else await createRoom(ownerId, values)
      Alert.alert('Success', room ? 'Room updated.' : 'Room created.')
      onSaved()
    } catch (error) {
      console.warn('Room save failed.', error)
      Alert.alert('Error', 'Unable to save room.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={totalLabel} visible={visible} onClose={onClose}>
      <FormInput label="Room number" value={values.roomNumber} onChangeText={(roomNumber) => setValues({ ...values, roomNumber })} />
      <FormInput label="Floor" keyboardType="numeric" value={String(values.floor)} onChangeText={(floor) => setValues({ ...values, floor: toNumber(floor) })} />
      <FormInput label="Room type" value={values.roomType} onChangeText={(roomType) => setValues({ ...values, roomType })} />
      <FormInput label="Area" keyboardType="numeric" value={String(values.area)} onChangeText={(area) => setValues({ ...values, area: toNumber(area) })} />
      <FormInput label="Monthly price" keyboardType="numeric" value={String(values.price)} onChangeText={(price) => setValues({ ...values, price: toNumber(price) })} />
      <FormInput label="Deposit" keyboardType="numeric" value={String(values.deposit)} onChangeText={(deposit) => setValues({ ...values, deposit: toNumber(deposit) })} />
      <FormInput label="Max tenants" keyboardType="numeric" value={String(values.maxTenants)} onChangeText={(maxTenants) => setValues({ ...values, maxTenants: toNumber(maxTenants) })} />
      <FormSelect label="Status" options={roomStatusOptions} value={values.status} onChange={(status) => setValues({ ...values, status: status as RoomStatus })} />
      <FormInput label="Description" multiline value={values.description ?? ''} onChangeText={(description) => setValues({ ...values, description })} />
      <ModalActions disabled={saving} onCancel={onClose} onSave={save} saveLabel={totalLabel} />
    </FormModal>
  )
}

function TenantFormModal({
  visible,
  onClose,
  onSaved,
  ownerId,
  tenant,
  rooms,
}: BaseModalProps & { tenant: TenantWithRoom | null; rooms: Room[] }) {
  const [values, setValues] = useState<TenantFormValues>(getInitialTenantValues(tenant, rooms))
  const [saving, setSaving] = useState(false)
  const roomOptions = rooms.map((room) => ({ label: `${room.roomNumber} - ${room.roomType}`, value: room.id }))

  useEffect(() => {
    setValues(getInitialTenantValues(tenant, rooms))
  }, [tenant, rooms, visible])

  async function save() {
    if (!ownerId) return
    if (!values.roomId) return Alert.alert('Validation Error', 'Room is required.')
    if (!values.fullName.trim()) return Alert.alert('Validation Error', 'Full name is required.')
    if (!values.email.trim()) return Alert.alert('Validation Error', 'Email is required.')
    if (!values.phone.trim()) return Alert.alert('Validation Error', 'Phone is required.')
    if (!values.identityNumber.trim()) return Alert.alert('Validation Error', 'Identity number is required.')

    setSaving(true)
    try {
      if (tenant) await updateTenant(tenant.id, values)
      else await createTenant(ownerId, values)
      Alert.alert('Success', tenant ? 'Tenant updated.' : 'Tenant created.')
      onSaved()
    } catch (error) {
      console.warn('Tenant save failed.', error)
      Alert.alert('Error', 'Unable to save tenant.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={tenant ? 'Update Tenant' : 'Create Tenant'} visible={visible} onClose={onClose}>
      <FormSelect label="Room" options={roomOptions} value={values.roomId} onChange={(roomId) => setValues({ ...values, roomId })} />
      <FormInput label="Full name" value={values.fullName} onChangeText={(fullName) => setValues({ ...values, fullName })} />
      <FormInput label="Email" keyboardType="email-address" value={values.email} onChangeText={(email) => setValues({ ...values, email })} />
      <FormInput label="Phone" keyboardType="phone-pad" value={values.phone} onChangeText={(phone) => setValues({ ...values, phone })} />
      <FormInput label="Identity number" value={values.identityNumber} onChangeText={(identityNumber) => setValues({ ...values, identityNumber })} />
      <FormInput label="Move-in date" value={values.moveInDate} onChangeText={(moveInDate) => setValues({ ...values, moveInDate })} placeholder="YYYY-MM-DD" />
      <FormSelect label="Status" options={tenantStatusOptions} value={values.status} onChange={(status) => setValues({ ...values, status: status as TenantStatus })} />
      <ModalActions disabled={saving} onCancel={onClose} onSave={save} saveLabel={tenant ? 'Update Tenant' : 'Create Tenant'} />
    </FormModal>
  )
}

function InvoiceFormModal({
  visible,
  onClose,
  onSaved,
  ownerId,
  invoice,
  tenants,
  rooms,
}: BaseModalProps & { invoice: Invoice | null; tenants: Tenant[]; rooms: Room[] }) {
  const [values, setValues] = useState<InvoiceFormValues>(getInitialInvoiceValues(invoice, tenants, rooms))
  const [saving, setSaving] = useState(false)
  const tenantOptions = tenants.map((tenant) => ({ label: tenant.fullName, value: tenant.id }))
  const roomOptions = rooms.map((room) => ({ label: `${room.roomNumber} - ${room.roomType}`, value: room.id }))
  const totals = useMemo(() => calculateInvoicePreview(values.items, values.discount), [values.items, values.discount])

  useEffect(() => {
    setValues(getInitialInvoiceValues(invoice, tenants, rooms))
  }, [invoice, tenants, rooms, visible])

  async function save() {
    if (!ownerId) return
    if (!values.invoiceCode.trim()) return Alert.alert('Validation Error', 'Invoice code is required.')
    if (!values.tenantId) return Alert.alert('Validation Error', 'Tenant is required.')
    if (!values.roomId) return Alert.alert('Validation Error', 'Room is required.')
    if (!values.items.length || values.items.some((item) => !item.name.trim())) {
      return Alert.alert('Validation Error', 'At least one valid invoice item is required.')
    }
    if (values.paidAmount > totals.totalAmount) {
      return Alert.alert('Validation Error', 'Paid amount cannot exceed total amount.')
    }

    setSaving(true)
    try {
      if (invoice) await updateInvoice(invoice.id, values)
      else await createInvoice(ownerId, values)
      Alert.alert('Success', invoice ? 'Invoice updated.' : 'Invoice created.')
      onSaved()
    } catch (error) {
      console.warn('Invoice save failed.', error)
      Alert.alert('Error', 'Unable to save invoice.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={invoice ? 'Update Invoice' : 'Create Invoice'} visible={visible} onClose={onClose}>
      <FormSelect label="Tenant" options={tenantOptions} value={values.tenantId} onChange={(tenantId) => setValues({ ...values, tenantId })} />
      <FormSelect label="Room" options={roomOptions} value={values.roomId} onChange={(roomId) => setValues({ ...values, roomId })} />
      <FormInput label="Invoice code" value={values.invoiceCode} onChangeText={(invoiceCode) => setValues({ ...values, invoiceCode })} />
      <FormInput label="Billing month" value={values.billingMonth} onChangeText={(billingMonth) => setValues({ ...values, billingMonth })} placeholder="YYYY-MM" />
      <FormInput label="Issue date" value={values.issueDate} onChangeText={(issueDate) => setValues({ ...values, issueDate })} placeholder="YYYY-MM-DD" />
      <FormInput label="Due date" value={values.dueDate} onChangeText={(dueDate) => setValues({ ...values, dueDate })} placeholder="YYYY-MM-DD" />
      <Text style={styles.sectionTitle}>Items</Text>
      {values.items.map((item, index) => (
        <View key={item.id} style={styles.itemEditor}>
          <FormInput label="Name" value={item.name} onChangeText={(name) => updateInvoiceItem(values, setValues, index, { name })} />
          <FormInput label="Quantity" keyboardType="numeric" value={String(item.quantity)} onChangeText={(quantity) => updateInvoiceItem(values, setValues, index, { quantity: toNumber(quantity) })} />
          <FormInput label="Unit price" keyboardType="numeric" value={String(item.unitPrice)} onChangeText={(unitPrice) => updateInvoiceItem(values, setValues, index, { unitPrice: toNumber(unitPrice) })} />
          <Text style={styles.meta}>Amount: {formatCurrency(item.quantity * item.unitPrice)}</Text>
        </View>
      ))}
      <PrimaryButton label="Add Item" onPress={() => setValues({ ...values, items: [...values.items, createInvoiceItem()] })} variant="secondary" />
      <FormInput label="Discount" keyboardType="numeric" value={String(values.discount)} onChangeText={(discount) => setValues({ ...values, discount: toNumber(discount) })} />
      <FormInput label="Paid amount" keyboardType="numeric" value={String(values.paidAmount)} onChangeText={(paidAmount) => setValues({ ...values, paidAmount: toNumber(paidAmount) })} />
      <FormSelect label="Status" options={invoiceStatusOptions} value={values.status} onChange={(status) => setValues({ ...values, status: status as InvoiceStatus })} />
      <FormInput label="Note" multiline value={values.note ?? ''} onChangeText={(note) => setValues({ ...values, note })} />
      <Text style={styles.meta}>Subtotal: {formatCurrency(totals.subtotal)}</Text>
      <Text style={styles.meta}>Total: {formatCurrency(totals.totalAmount)}</Text>
      <Text style={styles.meta}>Remaining: {formatCurrency(Math.max(0, totals.totalAmount - values.paidAmount))}</Text>
      <ModalActions disabled={saving} onCancel={onClose} onSave={save} saveLabel={invoice ? 'Update Invoice' : 'Create Invoice'} />
    </FormModal>
  )
}

function UtilityFormModal({
  visible,
  onClose,
  onSaved,
  ownerId,
  reading,
  rooms,
  tenants,
}: BaseModalProps & { reading: UtilityReading | null; rooms: Room[]; tenants: Tenant[] }) {
  const [values, setValues] = useState<UtilityReadingFormValues>(getInitialUtilityValues(reading, rooms))
  const [saving, setSaving] = useState(false)
  const roomOptions = rooms.map((room) => ({ label: `${room.roomNumber} - ${room.roomType}`, value: room.id }))
  const tenantOptions = [{ label: 'No tenant', value: '' }, ...tenants.map((tenant) => ({ label: tenant.fullName, value: tenant.id }))]
  const usage = Math.max(0, values.currentReading - values.previousReading)
  const totalAmount = usage * values.unitPrice

  useEffect(() => {
    setValues(getInitialUtilityValues(reading, rooms))
  }, [reading, rooms, visible])

  async function save() {
    if (!ownerId) return
    if (!values.roomId) return Alert.alert('Validation Error', 'Room is required.')
    if (values.currentReading < values.previousReading) {
      return Alert.alert('Validation Error', 'Current reading must be greater than or equal to previous reading.')
    }
    if (values.unitPrice <= 0) return Alert.alert('Validation Error', 'Unit price must be greater than 0.')

    setSaving(true)
    try {
      if (reading) await updateUtilityReading(reading.id, values)
      else await createUtilityReading(ownerId, values)
      Alert.alert('Success', reading ? 'Reading updated.' : 'Reading created.')
      onSaved()
    } catch (error) {
      console.warn('Utility reading save failed.', error)
      Alert.alert('Error', 'Unable to save utility reading.')
    } finally {
      setSaving(false)
    }
  }

  return (
    <FormModal title={reading ? 'Update Reading' : 'Create Reading'} visible={visible} onClose={onClose}>
      <FormSelect label="Room" options={roomOptions} value={values.roomId} onChange={(roomId) => setValues({ ...values, roomId })} />
      <FormSelect label="Tenant" options={tenantOptions} value={values.tenantId ?? ''} onChange={(tenantId) => setValues({ ...values, tenantId })} />
      <FormSelect label="Utility type" options={utilityTypeOptions} value={values.utilityType} onChange={(utilityType) => setValues({ ...values, utilityType: utilityType as UtilityType })} />
      <FormInput label="Billing month" value={values.billingMonth} onChangeText={(billingMonth) => setValues({ ...values, billingMonth })} placeholder="YYYY-MM" />
      <FormInput label="Previous reading" keyboardType="numeric" value={String(values.previousReading)} onChangeText={(previousReading) => setValues({ ...values, previousReading: toNumber(previousReading) })} />
      <FormInput label="Current reading" keyboardType="numeric" value={String(values.currentReading)} onChangeText={(currentReading) => setValues({ ...values, currentReading: toNumber(currentReading) })} />
      <FormInput label="Unit price" keyboardType="numeric" value={String(values.unitPrice)} onChangeText={(unitPrice) => setValues({ ...values, unitPrice: toNumber(unitPrice) })} />
      <FormSelect label="Status" options={utilityStatusOptions} value={values.status} onChange={(status) => setValues({ ...values, status: status as UtilityReadingStatus })} />
      <FormInput label="Note" multiline value={values.note ?? ''} onChangeText={(note) => setValues({ ...values, note })} />
      <Text style={styles.meta}>Usage: {usage}</Text>
      <Text style={styles.meta}>Total Amount: {formatCurrency(totalAmount)}</Text>
      <ModalActions disabled={saving} onCancel={onClose} onSave={save} saveLabel={reading ? 'Update Reading' : 'Create Reading'} />
    </FormModal>
  )
}

function FormModal({ title, visible, onClose, children }: { title: string; visible: boolean; onClose: () => void; children: React.ReactNode }) {
  return (
    <Modal animationType="slide" visible={visible} onRequestClose={onClose}>
      <ScrollView contentContainerStyle={styles.modalContent}>
        <Text style={styles.modalTitle}>{title}</Text>
        {children}
      </ScrollView>
    </Modal>
  )
}

function ModalActions({
  disabled,
  onCancel,
  onSave,
  saveLabel,
}: {
  disabled: boolean
  onCancel: () => void
  onSave: () => void
  saveLabel: string
}) {
  return (
    <View style={styles.modalActions}>
      <PrimaryButton disabled={disabled} label="Cancel" onPress={onCancel} variant="secondary" />
      <PrimaryButton disabled={disabled} label={disabled ? 'Saving...' : saveLabel} onPress={onSave} />
    </View>
  )
}

function getInitialRoomValues(room: Room | null): RoomFormValues {
  return {
    roomNumber: room?.roomNumber ?? '',
    floor: room?.floor ?? 1,
    roomType: room?.roomType ?? '',
    area: room?.area ?? 1,
    price: room?.price ?? 1,
    deposit: room?.deposit ?? 0,
    maxTenants: room?.maxTenants ?? 1,
    status: room?.status ?? 'available',
    description: room?.description ?? '',
  }
}

function getInitialTenantValues(tenant: TenantWithRoom | null, rooms: Room[]): TenantFormValues {
  return {
    roomId: tenant?.roomId ?? rooms[0]?.id ?? '',
    fullName: tenant?.fullName ?? '',
    email: tenant?.email ?? '',
    phone: tenant?.phone ?? '',
    identityNumber: tenant?.identityNumber ?? '',
    moveInDate: tenant?.moveInDate ?? '',
    status: tenant?.status ?? 'active',
  }
}

function getInitialInvoiceValues(invoice: Invoice | null, tenants: Tenant[], rooms: Room[]): InvoiceFormValues {
  const firstItem = createInvoiceItem()

  return {
    tenantId: invoice?.tenantId ?? tenants[0]?.id ?? '',
    roomId: invoice?.roomId ?? rooms[0]?.id ?? '',
    invoiceCode: invoice?.invoiceCode ?? '',
    billingMonth: invoice?.billingMonth ?? '',
    issueDate: invoice?.issueDate ?? '',
    dueDate: invoice?.dueDate ?? '',
    items: invoice?.items?.length ? invoice.items : [firstItem],
    discount: invoice?.discount ?? 0,
    paidAmount: invoice?.paidAmount ?? 0,
    status: invoice?.status ?? 'unpaid',
    note: invoice?.note ?? '',
  }
}

function getInitialUtilityValues(reading: UtilityReading | null, rooms: Room[]): UtilityReadingFormValues {
  return {
    roomId: reading?.roomId ?? rooms[0]?.id ?? '',
    tenantId: reading?.tenantId ?? '',
    utilityType: reading?.utilityType ?? 'electricity',
    billingMonth: reading?.billingMonth ?? '',
    previousReading: reading?.previousReading ?? 0,
    currentReading: reading?.currentReading ?? 0,
    unitPrice: reading?.unitPrice ?? 1,
    status: reading?.status ?? 'draft',
    note: reading?.note ?? '',
  }
}

function createInvoiceItem(): InvoiceItem {
  return {
    id: `${Date.now()}-${Math.random()}`,
    name: 'Monthly rent',
    quantity: 1,
    unitPrice: 0,
    amount: 0,
  }
}

function updateInvoiceItem(
  values: InvoiceFormValues,
  setValues: (values: InvoiceFormValues) => void,
  index: number,
  patch: Partial<InvoiceItem>,
) {
  const items = values.items.map((item, itemIndex) => (itemIndex === index ? { ...item, ...patch } : item))
  setValues({ ...values, items })
}

function calculateInvoicePreview(items: InvoiceItem[], discount: number) {
  const subtotal = items.reduce((total, item) => total + item.quantity * item.unitPrice, 0)
  return {
    subtotal,
    totalAmount: Math.max(0, subtotal - discount),
  }
}

function toNumber(value: string) {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : 0
}

function askOwnerResponse(title: string, onSubmit: (response: string) => void) {
  const prompt = (Alert as unknown as { prompt?: (title: string, message?: string, callback?: (text: string) => void) => void }).prompt

  if (prompt) {
    prompt(title, 'Optional owner response', (text) => onSubmit(text))
    return
  }

  Alert.alert(title, 'Owner response is optional. Continue without a response?', [
    { text: 'Cancel', style: 'cancel' },
    { text: 'Continue', onPress: () => onSubmit('') },
  ])
}

function statusTone(value?: string): 'primary' | 'success' | 'warning' | 'danger' | 'muted' {
  if (value === 'active' || value === 'occupied' || value === 'paid' || value === 'confirmed' || value === 'resolved') {
    return 'success'
  }
  if (value === 'pending' || value === 'unpaid' || value === 'draft' || value === 'in_review') return 'warning'
  if (value === 'overdue' || value === 'terminated' || value === 'rejected') return 'danger'
  if (value === 'available' || value === 'water') return 'primary'
  return 'muted'
}

function getUtilityPaymentStatus(reading: UtilityReading) {
  return reading.paymentStatus ?? (reading.status === 'paid' || reading.status === 'billed_paid' ? 'paid' : 'unpaid')
}

function getUtilityDisplayStatus(reading: UtilityReading) {
  return getUtilityPaymentStatus(reading) === 'paid' ? 'paid' : reading.status
}

function formatLabel(value?: string) {
  if (!value) return 'Not available'

  return value
    .split('_')
    .map((part) => capitalize(part))
    .join(' ')
}

function formatAiLabel(value?: string | null) {
  return value ? formatLabel(value) : 'Pending AI'
}

function formatAiCategory(feedback: Feedback) {
  if (feedback.aiSuggestedCategory) {
    return formatLabel(feedback.aiSuggestedCategory)
  }

  if (feedback.category && feedback.category !== 'other') {
    return formatLabel(feedback.category)
  }

  return 'Pending AI'
}

function formatAiPriority(feedback: Feedback) {
  return formatAiLabel(feedback.priority ?? feedback.aiSuggestedPriority)
}

function formatConfidence(value: number | undefined) {
  return typeof value === 'number' ? `${Math.round(value * 100)}%` : 'Not available'
}

function capitalize(value: string) {
  return value.charAt(0).toUpperCase() + value.slice(1)
}

const styles = StyleSheet.create({
  item: {
    gap: spacing.sm,
  },
  itemTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '800',
  },
  meta: {
    color: colors.muted,
    fontSize: 13,
    lineHeight: 19,
  },
  empty: {
    color: colors.muted,
    fontSize: 15,
  },
  error: {
    color: colors.danger,
    fontWeight: '700',
  },
  rowBetween: {
    alignItems: 'center',
    flexDirection: 'row',
    gap: spacing.md,
    justifyContent: 'space-between',
  },
  actions: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: spacing.sm,
  },
  modalContent: {
    backgroundColor: colors.background,
    gap: spacing.lg,
    padding: spacing.lg,
    paddingTop: 56,
  },
  modalTitle: {
    color: colors.text,
    fontSize: 24,
    fontWeight: '900',
  },
  modalActions: {
    flexDirection: 'row',
    gap: spacing.md,
  },
  sectionTitle: {
    color: colors.text,
    fontSize: 16,
    fontWeight: '900',
  },
  itemEditor: {
    backgroundColor: colors.surface,
    borderColor: colors.border,
    borderRadius: 16,
    borderWidth: 1,
    gap: spacing.md,
    padding: spacing.md,
  },
})
