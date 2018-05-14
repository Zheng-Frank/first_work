const restaurantExample =
    {
        // means that a restaurant reveives or send money
        paymentMeans: [
            {
                type: "CHECK", // For restaurant to RECEIVE money
                address: {
                    // ....
                },
                companyName: "Panda LLC."
            },
            {
                type: "DIRECT_DEPOSIT", // For restaurant to RECEIVE money
                routingNumber: '12344',
                accountNumnber: '34556',
                comment: 'from qMenu for invoice 123'
            },
            {
                type: "CREDIT_CARD", //  For restaurant to PAY qMenu
                card: {
                    // ....
                }
            }

        ]
    };

const qmenuExample =
    {
        // means that a restaurant reveives or send money
        paymentMeans: [
            {
                type: "CHECK", // For qMenu to RECEIVE payments
                address: {
                    // qMenu address goes here!....
                },
                payTo: "qMenu Inc."
            },
            {
                type: "QUICKBOOK", // For qMenu to PAY restaurants
                address: {
                    // qMenu address goes here!....
                },
                payTo: "qMenu Inc."
            },

        ]
    }
