import { internalError } from "../utils/helpers.js";


export const ORDER_STATUS = {
    PENDING: 'pending',
    ACCEPTED: 'accepted',
    PREPARING: 'preparing',
    READY: 'ready',
    COMPLETED: 'completed',
    CANCELLED: 'cancelled'
};

export const PAYMENT_STATUS = {
    PENDING: 'pending',
    COMPLETED: 'completed',
    FAILED: 'failed'
};

async function processPayment(paymentData) {
    return {
        success: true,
        transactionId: generateId(),
        status: PAYMENT_STATUS.COMPLETED,
        processedAt: getCurrentTimestamp()
    }
}

// dunno whether to export or not
function onSuccessfulPayment(orderId) {
    log('PAYMENT', `Payment successful for order ${orderId}`);

    const event = new CustomEvent('paymentSuccessEvent', {
        orderId
    });
    window.dispatchEvent(event);
}

function onPaymentFailure(orderId) {
    log('PAYMENT', `Payment failed for order ${orderId}`);

    // event or?
}

// createOrder backend
export async function createOrder(orderData) {
    try {
        const user = getCurrentUser();
        const { stallId, tableNumber = '', notes = '', paymentMethod } = orderData;

        // check stall
        if (!stallId) {
            return internalError(null, "Stall ID is missing");
        }

        // check paymentmethod
        if (!paymentMethod || !Object.values(PAYMENT_METHODS).includes(paymentMethod)) {
            return internalError(null, "payment method is invalid. check PAYMENT_METHODS constant");
        }

        // check cart
        const cartResponse = await getCart();
        if (!cartResponse.success || cartResponse.data.items.length === 0) {
            return internalError(null, "Cart is empty");
        }

        const cartItems = cartResponse.data.items;
        // ensure that the cart items are even from the right stall.
        const filteredItems = cartItems.filter(item => item.stallId === stallId);

        if (cartItemsForStall.length === 0) {
            return internalError(null, "No items from this stall in cart");
        }

        // create order
        const orderId = generateId();
        const totalAmount = calculateCartTotal(cartItemsForStall);

        const newOrder = {
            orderId,
            userId: user ? user.userId : 'guest_' + generateId(),
            stallId,
            userEmail: user ? user.email : 'guest@chimmy.xyz',
            items: filteredItems,
            totalAmount,
            status: ORDER_STATUS.PENDING,
            paymentMethod,
            paymentStatus: PAYMENT_STATUS.PENDING,
            deliveryTo: tableNumber || (user ? 'Pickup at stall' : 'N/A'),
            notes,
            createdAt: getCurrentTimestamp(),
            updatedAt: getCurrentTimestamp(),
            estimatedCompletionTime: getCurrentTimestamp() + (30 * 60 * 1000) // 30 mins
        };

        await set(ref(db, `orders/${orderId}`), newOrder);

        log('ORDER', `Order created: ${orderId}`, { stallId, totalAmount });

        // remove from cart
        for (const item of cartItemsForStall) {
            if (user) {
                await remove(ref(db, `carts/${user.userId}/${item.cartItemId}`));
            } else {
                let cart = JSON.parse(localStorage.getItem('guestCart') || '[]');
                cart = cart.filter(c => c.cartItemId !== item.cartItemId);
                localStorage.setItem('guestCart', JSON.stringify(cart));
            }
        }

        const paymentData = {
            orderId,
            amount: totalAmount,
            method: paymentMethod,
            userId: user ? user.userId : 'guest',
            createdAt: getCurrentTimestamp()
        };

        const paymentResult = await processPayment(paymentData);

        if (paymentResult.success) {
            await update(ref(db, `orders/${orderId}`), {
                paymentStatus: PAYMENT_STATUS.COMPLETED,
                paymentId: paymentResult.transactionId,
                paymentCompletedAt: paymentResult.processedAt
            });

            onSuccessfulPayment(orderId);

            return {
                orderId,
                status: ORDER_STATUS.PENDING,
                totalAmount,
                paymentTransactionId: paymentResult.transactionId
            };

        } else {
            await update(ref(db, `orders/${orderId}`), {
                status: ORDER_STATUS.CANCELLED,
                paymentStatus: PAYMENT_STATUS.FAILED,
                cancelReason: 'Payment failed',
                cancelledAt: getCurrentTimestamp()
            });

            onPaymentFailure(orderId);

            return internalError(null, paymentResult.error);
        }

    } catch (error) {
        log('ORDER', `Create order error: ${error.message}`, error);
        return internalError(null, error.message);
    }
}