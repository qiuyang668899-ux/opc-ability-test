export type PaymentForm = { action: string; method: 'POST'; fields: Record<string,string>; environment: 'production' | 'sandbox' }
export function submitPaymentForm(payment: PaymentForm) {
  const url = new URL(payment.action)
  const expected = payment.environment === 'production' ? 'openapi.alipay.com' : payment.environment === 'sandbox' ? 'openapi-sandbox.dl.alipaydev.com' : ''
  if (url.protocol !== 'https:' || url.hostname !== expected || url.pathname !== '/gateway.do' || url.search || url.username || url.password || url.port || url.hash || payment.method !== 'POST') throw new Error('支付表单地址未通过验证，未发起付款。')
  // The public HOS application never accepts sandbox orders or sandbox entitlements.
  if (payment.environment !== 'production') throw new Error('测试订单不能在正式 HOS 中支付。')
  if (payment.fields.method !== 'alipay.trade.page.pay' || payment.fields.sign_type !== 'RSA2' || !payment.fields.sign || !payment.fields.app_id) throw new Error('支付表单不完整，请重新查询订单。')
  const allowed = new Set(['app_id','method','format','charset','sign_type','version','timestamp','notify_url','return_url','biz_content','sign'])
  const form = document.createElement('form'); form.method = 'POST'; form.action = url.href; form.hidden = true
  for (const [name,value] of Object.entries(payment.fields)) {
    if (!allowed.has(name) || typeof value !== 'string' || value.length > 16000) throw new Error('支付表单参数异常。')
    const input = document.createElement('input'); input.type = 'hidden'; input.name = name; input.value = value; form.appendChild(input)
  }
  document.body.appendChild(form)
  // No returned HTML or script is evaluated; only a validated form is submitted.
  HTMLFormElement.prototype.submit.call(form)
  window.setTimeout(() => form.remove(), 1000)
}
