export interface ConfirmedSupporter {
  id: string
  nickname: string
  amount: number
  message?: string
  confirmedAt: string
}

// Public records are added only after the project owner verifies payment.
export const CONFIRMED_SUPPORTERS: ConfirmedSupporter[] = []
