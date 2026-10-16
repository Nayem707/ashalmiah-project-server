import { z } from 'zod';
import { ORDER_NUMBER_PATTERN } from '../../utils/orderNumber';
import { normalizeBdMobile } from '../../utils/phone';

const MOBILE_MESSAGE = 'Please enter a valid mobile number, e.g. 01712345678';

const mobileNumber = z.string({ required_error: MOBILE_MESSAGE }).transform((value, ctx) => {
  const phone = normalizeBdMobile(value);
  if (!phone) {
    ctx.addIssue({ code: z.ZodIssueCode.custom, message: MOBILE_MESSAGE });
    return z.NEVER;
  }
  return phone;
});

export const trackOrderSchema = z.object({
  body: z.object({ phone: mobileNumber }),
});

const orderNumber = z
  .string({ required_error: 'Please select an order' })
  .transform((value) => value.trim().toUpperCase())
  .refine((value) => ORDER_NUMBER_PATTERN.test(value), 'Please select a valid order');

const cancelReason = z
  .string({ required_error: 'Please tell us why you are cancelling' })
  .trim()
  .min(3, 'Please tell us why you are cancelling')
  .max(500, 'Reason must be 500 characters or fewer');

export const trackOrderDetailsSchema = z.object({
  body: z.object({ phone: mobileNumber, orderNumber }),
});

export const cancelOrderSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({ reason: cancelReason }),
});

export const guestCancelOrderSchema = z.object({
  body: z.object({
    phone: mobileNumber,
    orderNumber,
    code: z
      .string({ required_error: 'Please enter your cancellation code' })
      .trim()
      .min(1, 'Please enter your cancellation code')
      .max(32),
    reason: cancelReason,
  }),
});

export const checkoutSchema = z.object({
  body: z.object({
    items: z
      .array(
        z.object({
          productId: z.string().min(1),
          quantity: z.number().int().positive(),
          selectedColor: z.string().optional(),
          selectedSize: z.string().optional(),
        }),
      )
      .min(1, 'Cart is empty'),
    paymentMethod: z.enum(['COD', 'ONLINE']).optional(),
    shipping: z.object({
      fullName: z.string().min(2),
      phone: z.string().min(3),
      country: z.string().min(1),
      city: z.string().min(1),
      street: z.string().min(1),
      postalCode: z.string().optional(),
      deliveryArea: z.enum(['INSIDE_DHAKA', 'OUTSIDE_DHAKA']).optional(),
    }),
  }),
});

export const listOrdersSchema = z.object({
  query: z.object({
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(100).optional(),
    status: z
      .enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'])
      .optional(),
    search: z.string().optional(),
    customerType: z.enum(['USER', 'GUEST']).optional(),
  }),
});

export const idParamSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
});

export const updateStatusSchema = z.object({
  params: z.object({ id: z.string().min(1) }),
  body: z.object({
    status: z.enum(['PENDING', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED']),
    paymentStatus: z.enum(['PAID', 'UNPAID', 'REFUNDED']).optional(),
  }),
});
