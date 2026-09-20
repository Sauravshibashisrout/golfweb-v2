// =============================================================================
// Payment Provider Abstraction (Razorpay Primary, Stripe Extensible)
// All amounts in integer paise (1 INR = 100 paise).
// =============================================================================

export type PaymentProviderType = 'razorpay' | 'stripe'

export type CreateOrderParams = {
  amountPaise: number
  currency?: string
  receipt: string
  notes?: Record<string, string>
}

export type OrderResult = {
  provider: PaymentProviderType
  orderId: string
  amountPaise: number
  currency: string
  keyId?: string
}

export interface PaymentProvider {
  createOrder(params: CreateOrderParams): Promise<OrderResult>
  verifyWebhookSignature(rawBody: string, signature: string, secret: string): Promise<boolean>
}

/**
 * Razorpay implementation using direct REST API + Web Crypto HMAC
 */
export class RazorpayProvider implements PaymentProvider {
  private keyId: string
  private keySecret: string

  constructor(keyId?: string, keySecret?: string) {
    this.keyId = keyId || Deno.env.get('RAZORPAY_KEY_ID') || ''
    this.keySecret = keySecret || Deno.env.get('RAZORPAY_KEY_SECRET') || ''
  }

  async createOrder(params: CreateOrderParams): Promise<OrderResult> {
    const { amountPaise, currency = 'INR', receipt, notes = {} } = params

    // Fallback for local testing / mock when keys are placeholder
    if (!this.keyId || this.keyId.includes('placeholder') || !this.keySecret || this.keySecret.includes('placeholder')) {
      return {
        provider: 'razorpay',
        orderId: `order_mock_${Date.now()}_${Math.random().toString(36).slice(2, 7)}`,
        amountPaise,
        currency,
        keyId: this.keyId || 'rzp_test_placeholder',
      }
    }

    const auth = btoa(`${this.keyId}:${this.keySecret}`)
    const res = await fetch('https://api.razorpay.com/v1/orders', {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        amount: amountPaise,
        currency,
        receipt,
        notes,
      }),
    })

    if (!res.ok) {
      const err = await res.text()
      throw new Error(`Razorpay order creation failed: ${err}`)
    }

    const data = await res.json()
    return {
      provider: 'razorpay',
      orderId: data.id,
      amountPaise: data.amount,
      currency: data.currency,
      keyId: this.keyId,
    }
  }

  async verifyWebhookSignature(rawBody: string, signature: string, secret: string): Promise<boolean> {
    if (!secret || secret.includes('placeholder')) {
      // In sandbox/testing mode with placeholder secret, accept mock signatures
      return true
    }

    const enc = new TextEncoder()
    const key = await crypto.subtle.importKey(
      'raw',
      enc.encode(secret),
      { name: 'HMAC', hash: 'SHA-256' },
      false,
      ['sign']
    )
    const sigBuf = await crypto.subtle.sign('HMAC', key, enc.encode(rawBody))
    const expectedSig = Array.from(new Uint8Array(sigBuf))
      .map(b => b.toString(16).padStart(2, '0'))
      .join('')

    return expectedSig === signature.toLowerCase()
  }
}

/** Factory to get payment provider (default: Razorpay) */
export function getPaymentProvider(type: PaymentProviderType = 'razorpay'): PaymentProvider {
  if (type === 'razorpay') {
    return new RazorpayProvider()
  }
  throw new Error(`Unsupported payment provider: ${type}`)
}
