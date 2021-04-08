# Unconfirmed orders: How it works technically

## Purpose: We want to track orders in which restaurants have not confirmed the order within a specified timeframe, which is dependent on whether it is scheduled or non-scheduled

## How does this component work?

In order to find unconfirmed orders, we query for the all the orders in the database and filter for unconfirmed it based on specific criteria

The first criteria for an unconfirmed NON SCHEDULED order is that the latest status is 'SUBMITTED'. This indicates that the order has not been confirmed. The second criteria for an unconfirmed NON SCHEDULED order is that atleast 10 minutes have passed since this order was placed.

This query matches that condition:

let unconfirmedOrders = ordersWithSatuses.filter(o => new Date(o.createdAt).valueOf() < minutesAgo.valueOf() && o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED');

Unconfirmed SCHEDULED orders follow a different criteria. Just like the NON SCHEDULED orders, the latest status must be 'SUBMITTED' which can be ascertained with the criteria

o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED'

However, the difference is that the restaurant has this amount of time to confirm: the time to deliver the order - (pick up || delivery time), which is dependent on whether the TYPE of the order (a field in the response object), is pick up or delivery. If the current time is greater than the time in point of timeToDeliver - (pickUp || deliveryTime), the order is considered unconfirmed

This line of code takes care of that logic

const unconfirmedScheduledOrders = ordersWithSatuses.filter(o => {
let statusCondition = o.statuses && o.statuses.length > 0 && o.statuses[o.statuses.length - 1].status === 'SUBMITTED';

      if (!statusCondition) {
        return false
      }
      if (o.type.toLowerCase() === 'pickup') {
        let pickupTime = o.pickupTimeEstimate


        return this.now.getTime() > new Date(o.timeToDeliver - (pickupTime * 60 * 1000)).getTime()
        // return new Date(new Date().getTime() - (new Date(o.timeToDeliver).getTime() - new Date(o.pickUpTime).getTime())).getTime() > this.now.getTime()
      } else if (o.type.toLowerCase() === 'delivery') {
        let deliveryTime = o.deliveryTimeEstimate


        return this.now.getTime() > new Date(o.timeToDeliver - (deliveryTime * 60 * 1000)).getTime()

      }

    })
