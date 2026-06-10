export type RoomStatus = 'available' | 'occupied' | 'maintenance'

export interface Room {
  id: string
  ownerId: string
  boardingHouseId?: string
  roomNumber: string
  floor: number
  roomType: string
  area: number
  price: number
  deposit: number
  maxTenants: number
  status: RoomStatus
  description?: string
  createdAt?: unknown
  updatedAt?: unknown
}

export interface RoomFormValues {
  roomNumber: string
  floor: number
  roomType: string
  area: number
  price: number
  deposit: number
  maxTenants: number
  status: RoomStatus
  description?: string
}
