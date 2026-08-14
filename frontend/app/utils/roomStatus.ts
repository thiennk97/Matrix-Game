import type { RoomStatus } from '~/types'

export const isLobbyStatus = (status: RoomStatus | undefined | null): boolean => status === 'LOBBY'
export const isPlayingStatus = (status: RoomStatus | undefined | null): boolean => status === 'PLAYING'
export const isPausedStatus = (status: RoomStatus | undefined | null): boolean => status === 'PAUSED'
export const isFinishedStatus = (status: RoomStatus | undefined | null): boolean => status === 'FINISHED'
