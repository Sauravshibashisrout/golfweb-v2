export function loadRazorpayScript(): Promise<boolean> {
  return new Promise((resolve) => {
    if (typeof window === 'undefined') return resolve(false)
    if ((window as unknown as { Razorpay: unknown }).Razorpay) return resolve(true)

    const script = document.createElement('script')
    script.src = 'https://checkout.razorpay.com/v1/checkout.js'
    script.async = true
    script.onload = () => resolve(true)
    script.onerror = () => resolve(false)
    document.body.appendChild(script)
  })
}

export type RazorpayPaymentResponse = {
  razorpay_payment_id: string
  razorpay_order_id: string
  razorpay_signature: string
}

export type OpenRazorpayParams = {
  orderId: string
  amountPaise: number
  currency: string
  keyId?: string
  name: string
  description?: string
  user?: {
    name?: string
    email?: string
    phone?: string
  }
  onSuccess: (res: RazorpayPaymentResponse) => void
  onDismiss?: () => void
}

export async function openRazorpayCheckout(params: OpenRazorpayParams): Promise<void> {
  const loaded = await loadRazorpayScript()
  if (!loaded) {
    throw new Error('Failed to load payment gateway SDK. Please check your internet connection.')
  }

  // Fallback for development/sandbox when running mock orders
  if (params.orderId.startsWith('order_mock_')) {
    const proceed = confirm(`[Sandbox Checkout]\n\nAmount: ₹${(params.amountPaise / 100).toLocaleString('en-IN')}\nDescription: ${params.description || params.name}\n\nSimulate successful payment?`)
    if (proceed) {
      params.onSuccess({
        razorpay_payment_id: `pay_mock_${Date.now()}`,
        razorpay_order_id: params.orderId,
        razorpay_signature: `sig_mock_${Date.now()}`,
      })
    } else {
      params.onDismiss?.()
    }
    return
  }

  const RazorpayConstructor = (window as unknown as { Razorpay: new (opts: unknown) => { open: () => void } }).Razorpay

  const options = {
    key: params.keyId || process.env.NEXT_PUBLIC_RAZORPAY_KEY_ID || '',
    amount: params.amountPaise,
    currency: params.currency,
    name: 'GolfGives',
    description: params.description || params.name,
    order_id: params.orderId,
    prefill: {
      name: params.user?.name || '',
      email: params.user?.email || '',
      contact: params.user?.phone || '',
    },
    theme: {
      color: '#10b981', // energetic purpose emerald
    },
    handler: (response: RazorpayPaymentResponse) => {
      params.onSuccess(response)
    },
    modal: {
      ondismiss: () => {
        params.onDismiss?.()
      },
    },
  }

  const rzp = new RazorpayConstructor(options)
  rzp.open()
}
