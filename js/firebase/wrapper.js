import {
    db,
    ref,
    set,
    get,
    update,
    remove,
    child,
    push as firebasePush
} from './realtimedb.js';

// ============================================
// OPERATOR FUNCTIONS
// ============================================

export async function addOperator(OperatorID, OperatorName, ContactPerson) {
    try {
        const operatorRef = ref(db, `operator/${OperatorID}`);
        await set(operatorRef, { OperatorID, OperatorName, ContactPerson });
        return true;
    } catch (error) {
        console.error('Error adding operator:', error);
        return false;
    }
}

export async function getOperator(OperatorID) {
    try {
        const operatorRef = ref(db, `operator/${OperatorID}`);
        const snapshot = await get(operatorRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching operator:', error);
        return null;
    }
}

export async function getAllOperators() {
    try {
        const operatorsRef = ref(db, 'operator');
        const snapshot = await get(operatorsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching operators:', error);
        return null;
    }
}

// ============================================
// HAWKER CENTRE FUNCTIONS
// ============================================

export async function addHawkerCentre(HawkerCentreID, HCName, HCAddress, OperatorID, PriceRange, Region, ImageURL) {
    try {
        const centreRef = ref(db, `hawkerCentre/${HawkerCentreID}`);
        await set(centreRef, { 
            HawkerCentreID, 
            HCName, 
            HCAddress, 
            OperatorID, 
            PriceRange,
            Region,
            ImageURL  
        });
        return true;
    } catch (error) {
        console.error('Error adding hawker centre:', error);
        return false;
    }
}



export async function getHawkerCentre(HawkerCentreID) {
    try {
        const centreRef = ref(db, `hawkerCentre/${HawkerCentreID}`);
        const snapshot = await get(centreRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching hawker centre:', error);
        return null;
    }
}

export async function getAllHawkerCentres() {
    try {
        const centresRef = ref(db, 'hawkerCentre');
        const snapshot = await get(centresRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching hawker centres:', error);
        return null;
    }
}

// ============================================
// STALL OWNER FUNCTIONS
// ============================================

export async function addStallOwner(OwnerID, OwnerName, OwnerNRIC, OwnerContactNo) {
    try {
        const ownerRef = ref(db, `stallOwner/${OwnerID}`);
        await set(ownerRef, { OwnerID, OwnerName, OwnerNRIC, OwnerContactNo });
        return true;
    } catch (error) {
        console.error('Error adding stall owner:', error);
        return false;
    }
}

export async function getStallOwner(OwnerID) {
    try {
        const ownerRef = ref(db, `stallOwner/${OwnerID}`);
        const snapshot = await get(ownerRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching stall owner:', error);
        return null;
    }
}

export async function getAllStallOwners() {
    try {
        const ownersRef = ref(db, 'stallOwner');
        const snapshot = await get(ownersRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching stall owners:', error);
        return null;
    }
}

// ============================================
// FOOD STALL FUNCTIONS
// ============================================

export async function addFoodStall(StallID, StallUnitNo, StallName, StallDesc, HawkerCentreID) {
    try {
        const stallRef = ref(db, `foodStall/${StallID}`);
        await set(stallRef, { StallID, StallUnitNo, StallName, StallDesc, HawkerCentreID });
        return true;
    } catch (error) {
        console.error('Error adding food stall:', error);
        return false;
    }
}

export async function getFoodStall(StallID) {
    try {
        const stallRef = ref(db, `foodStall/${StallID}`);
        const snapshot = await get(stallRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching food stall:', error);
        return null;
    }
}

export async function getAllFoodStalls() {
    try {
        const stallsRef = ref(db, 'foodStall');
        const snapshot = await get(stallsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching food stalls:', error);
        return null;
    }
}

// ============================================
// RENTAL AGREEMENT FUNCTIONS
// ============================================

export async function addRentalAgreement(AgreementID, AgrStartDate, AgrEndDate, AgrTermCondition, RentalPrice, OwnerID, StallID) {
    try {
        const agreementRef = ref(db, `rentalAgreement/${AgreementID}`);
        await set(agreementRef, { AgreementID, AgrStartDate, AgrEndDate, AgrTermCondition, RentalPrice, OwnerID, StallID });
        return true;
    } catch (error) {
        console.error('Error adding rental agreement:', error);
        return false;
    }
}

export async function getRentalAgreement(AgreementID) {
    try {
        const agreementRef = ref(db, `rentalAgreement/${AgreementID}`);
        const snapshot = await get(agreementRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching rental agreement:', error);
        return null;
    }
}

export async function getAllRentalAgreements() {
    try {
        const agreementsRef = ref(db, 'rentalAgreement');
        const snapshot = await get(agreementsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching rental agreements:', error);
        return null;
    }
}

// ============================================
// CUSTOMER FUNCTIONS
// ============================================

export async function addCustomer(CustomerID, CustNRIC, CustName, CustContactNo, CustEmail) {
    try {
        const customerRef = ref(db, `customer/${CustomerID}`);
        await set(customerRef, { CustomerID, CustNRIC, CustName, CustContactNo, CustEmail });
        return true;
    } catch (error) {
        console.error('Error adding customer:', error);
        return false;
    }
}

export async function getCustomer(CustomerID) {
    try {
        const customerRef = ref(db, `customer/${CustomerID}`);
        const snapshot = await get(customerRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching customer:', error);
        return null;
    }
}

export async function getAllCustomers() {
    try {
        const customersRef = ref(db, 'customer');
        const snapshot = await get(customersRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching customers:', error);
        return null;
    }
}

// ============================================
// CUSTOMER ORDER FUNCTIONS
// ============================================

export async function addCustOrder(OrderID, OrderDate, PmtType, CustomerID) {
    try {
        const orderRef = ref(db, `custOrder/${OrderID}`);
        await set(orderRef, { OrderID, OrderDate, PmtType, CustomerID });
        return true;
    } catch (error) {
        console.error('Error adding customer order:', error);
        return false;
    }
}

export async function getCustOrder(OrderID) {
    try {
        const orderRef = ref(db, `custOrder/${OrderID}`);
        const snapshot = await get(orderRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching customer order:', error);
        return null;
    }
}

export async function getAllCustOrders() {
    try {
        const ordersRef = ref(db, 'custOrder');
        const snapshot = await get(ordersRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching customer orders:', error);
        return null;
    }
}

// ============================================
// MENU ITEM FUNCTIONS
// ============================================

export async function addMenuItem(StallID, ItemCode, ItemDesc, ItemPrice, ItemCategory) {
    try {
        const key = `${StallID}_${ItemCode}`;
        const itemRef = ref(db, `menuItem/${key}`);
        await set(itemRef, { StallID, ItemCode, ItemDesc, ItemPrice, ItemCategory });
        return true;
    } catch (error) {
        console.error('Error adding menu item:', error);
        return false;
    }
}

export async function getMenuItem(StallID, ItemCode) {
    try {
        const key = `${StallID}_${ItemCode}`;
        const itemRef = ref(db, `menuItem/${key}`);
        const snapshot = await get(itemRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching menu item:', error);
        return null;
    }
}

export async function getAllMenuItems() {
    try {
        const itemsRef = ref(db, 'menuItem');
        const snapshot = await get(itemsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching menu items:', error);
        return null;
    }
}

// ============================================
// ORDER ITEM FUNCTIONS
// ============================================

export async function addOrderItem(OrderID, OrderItemNo, StallID, ItemCode, Quantity, UnitPrice) {
    try {
        const key = `${OrderID}_${OrderItemNo}`;
        const itemRef = ref(db, `orderItem/${key}`);
        await set(itemRef, { OrderID, OrderItemNo, StallID, ItemCode, Quantity, UnitPrice });
        return true;
    } catch (error) {
        console.error('Error adding order item:', error);
        return false;
    }
}

export async function getOrderItem(OrderID, OrderItemNo) {
    try {
        const key = `${OrderID}_${OrderItemNo}`;
        const itemRef = ref(db, `orderItem/${key}`);
        const snapshot = await get(itemRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching order item:', error);
        return null;
    }
}

export async function getAllOrderItems() {
    try {
        const itemsRef = ref(db, 'orderItem');
        const snapshot = await get(itemsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching order items:', error);
        return null;
    }
}

// ============================================
// FEEDBACK FUNCTIONS
// ============================================

export async function addFeedback(FbkID, FbkComment, FbkDateTime, FbkRating, CustomerID, StallID) {
    try {
        const feedbackRef = ref(db, `feedback/${FbkID}`);
        await set(feedbackRef, { FbkID, FbkComment, FbkDateTime, FbkRating, CustomerID, StallID });
        return true;
    } catch (error) {
        console.error('Error adding feedback:', error);
        return false;
    }
}

export async function getFeedback(FbkID) {
    try {
        const feedbackRef = ref(db, `feedback/${FbkID}`);
        const snapshot = await get(feedbackRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return null;
    }
}

export async function getAllFeedback() {
    try {
        const feedbackRef = ref(db, 'feedback');
        const snapshot = await get(feedbackRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching feedback:', error);
        return null;
    }
}

// ============================================
// COMPLAINT FUNCTIONS
// ============================================

export async function addComplaint(FbkID, Category) {
    try {
        const complaintRef = ref(db, `complaint/${FbkID}`);
        await set(complaintRef, { FbkID, Category });
        return true;
    } catch (error) {
        console.error('Error adding complaint:', error);
        return false;
    }
}

export async function getComplaint(FbkID) {
    try {
        const complaintRef = ref(db, `complaint/${FbkID}`);
        const snapshot = await get(complaintRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching complaint:', error);
        return null;
    }
}

export async function getAllComplaints() {
    try {
        const complaintsRef = ref(db, 'complaint');
        const snapshot = await get(complaintsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching complaints:', error);
        return null;
    }
}

// ============================================
// CUISINE FUNCTIONS
// ============================================

export async function addCuisine(CuisineID, CuisineDesc) {
    try {
        const cuisineRef = ref(db, `cuisine/${CuisineID}`);
        await set(cuisineRef, { CuisineID, CuisineDesc });
        return true;
    } catch (error) {
        console.error('Error adding cuisine:', error);
        return false;
    }
}

export async function getCuisine(CuisineID) {
    try {
        const cuisineRef = ref(db, `cuisine/${CuisineID}`);
        const snapshot = await get(cuisineRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching cuisine:', error);
        return null;
    }
}

export async function getAllCuisines() {
    try {
        const cuisinesRef = ref(db, 'cuisine');
        const snapshot = await get(cuisinesRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching cuisines:', error);
        return null;
    }
}

// ============================================
// MENU ITEM CUISINE FUNCTIONS
// ============================================

export async function addMenuItemCuisine(CuisineID, StallID, ItemCode) {
    try {
        const key = `${CuisineID}_${StallID}_${ItemCode}`;
        const itemCuisineRef = ref(db, `menuItemCuisine/${key}`);
        await set(itemCuisineRef, { CuisineID, StallID, ItemCode });
        return true;
    } catch (error) {
        console.error('Error adding menu item cuisine:', error);
        return false;
    }
}

export async function getMenuItemCuisine(CuisineID, StallID, ItemCode) {
    try {
        const key = `${CuisineID}_${StallID}_${ItemCode}`;
        const itemCuisineRef = ref(db, `menuItemCuisine/${key}`);
        const snapshot = await get(itemCuisineRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching menu item cuisine:', error);
        return null;
    }
}

export async function getAllMenuItemCuisines() {
    try {
        const itemCuisinesRef = ref(db, 'menuItemCuisine');
        const snapshot = await get(itemCuisinesRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching menu item cuisines:', error);
        return null;
    }
}

// ============================================
// NEA OFFICER FUNCTIONS
// ============================================

export async function addNEAOfficer(OfficerID, OfficerName, OfficerContactNo) {
    try {
        const officerRef = ref(db, `neaOfficer/${OfficerID}`);
        await set(officerRef, { OfficerID, OfficerName, OfficerContactNo });
        return true;
    } catch (error) {
        console.error('Error adding NEA officer:', error);
        return false;
    }
}

export async function getNEAOfficer(OfficerID) {
    try {
        const officerRef = ref(db, `neaOfficer/${OfficerID}`);
        const snapshot = await get(officerRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching NEA officer:', error);
        return null;
    }
}

export async function getAllNEAOfficers() {
    try {
        const officersRef = ref(db, 'neaOfficer');
        const snapshot = await get(officersRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching NEA officers:', error);
        return null;
    }
}

// ============================================
// INSPECTION FUNCTIONS
// ============================================

export async function addInspection(InspectionID, InspectionDate, HygieneGrade, GradeExpiry, OfficerID, StallID) {
    try {
        const inspectionRef = ref(db, `inspection/${InspectionID}`);
        await set(inspectionRef, { InspectionID, InspectionDate, HygieneGrade, GradeExpiry, OfficerID, StallID });
        return true;
    } catch (error) {
        console.error('Error adding inspection:', error);
        return false;
    }
}

export async function getInspection(InspectionID) {
    try {
        const inspectionRef = ref(db, `inspection/${InspectionID}`);
        const snapshot = await get(inspectionRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching inspection:', error);
        return null;
    }
}

export async function getAllInspections() {
    try {
        const inspectionsRef = ref(db, 'inspection');
        const snapshot = await get(inspectionsRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching inspections:', error);
        return null;
    }
}

// ============================================
// INSPECTION REMARK FUNCTIONS
// ============================================

export async function addInspectionRemark(InspectionID, InspectionRemark) {
    try {
        const remarkRef = ref(db, `inspectionRemark/${InspectionID}`);
        await set(remarkRef, { InspectionID, InspectionRemark });
        return true;
    } catch (error) {
        console.error('Error adding inspection remark:', error);
        return false;
    }
}

export async function getInspectionRemark(InspectionID) {
    try {
        const remarkRef = ref(db, `inspectionRemark/${InspectionID}`);
        const snapshot = await get(remarkRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching inspection remark:', error);
        return null;
    }
}

export async function getAllInspectionRemarks() {
    try {
        const remarksRef = ref(db, 'inspectionRemark');
        const snapshot = await get(remarksRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching inspection remarks:', error);
        return null;
    }
}

// ============================================
// PROMOTION FUNCTIONS
// ============================================

export async function addPromotion(PromoID, PromoDesc, PromoStartDate, PromoEndDate, StallID) {
    try {
        const promoRef = ref(db, `promotion/${PromoID}`);
        await set(promoRef, { PromoID, PromoDesc, PromoStartDate, PromoEndDate, StallID });
        return true;
    } catch (error) {
        console.error('Error adding promotion:', error);
        return false;
    }
}

export async function getPromotion(PromoID) {
    try {
        const promoRef = ref(db, `promotion/${PromoID}`);
        const snapshot = await get(promoRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching promotion:', error);
        return null;
    }
}

export async function getAllPromotions() {
    try {
        const promosRef = ref(db, 'promotion');
        const snapshot = await get(promosRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching promotions:', error);
        return null;
    }
}

// ============================================
// LIKES FUNCTIONS
// ============================================

export async function addLike(CustomerID, StallID, ItemCode) {
    try {
        const key = `${CustomerID}_${StallID}_${ItemCode}`;
        const likeRef = ref(db, `likes/${key}`);
        await set(likeRef, { CustomerID, StallID, ItemCode });
        return true;
    } catch (error) {
        console.error('Error adding like:', error);
        return false;
    }
}

export async function getLike(CustomerID, StallID, ItemCode) {
    try {
        const key = `${CustomerID}_${StallID}_${ItemCode}`;
        const likeRef = ref(db, `likes/${key}`);
        const snapshot = await get(likeRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching like:', error);
        return null;
    }
}

export async function getAllLikes() {
    try {
        const likesRef = ref(db, 'likes');
        const snapshot = await get(likesRef);
        return snapshot.exists() ? snapshot.val() : null;
    } catch (error) {
        console.error('Error fetching likes:', error);
        return null;
    }
}

export async function getCustomerLikes(CustomerID) {
    try {
        const allLikes = await getAllLikes();
        if (!allLikes) return null;
        
        const customerLikes = {};
        for (const [key, like] of Object.entries(allLikes)) {
            if (like.CustomerID === CustomerID) {
                customerLikes[key] = like;
            }
        }
        return Object.keys(customerLikes).length > 0 ? customerLikes : null;
    } catch (error) {
        console.error('Error fetching customer likes:', error);
        return null;
    }
}

// ============================================
// DELETE FUNCTIONS (Generic)
// ============================================

export async function deleteData(table, id) {
    try {
        const dataRef = ref(db, `${table}/${id}`);
        await remove(dataRef);
        return true;
    } catch (error) {
        console.error(`Error deleting from ${table}:`, error);
        return false;
    }
}

// ============================================
// UPDATE FUNCTIONS (Generic)
// ============================================

export async function updateData(table, id, data) {
    try {
        const dataRef = ref(db, `${table}/${id}`);
        await update(dataRef, data);
        return true;
    } catch (error) {
        console.error(`Error updating ${table}:`, error);
        return false;
    }
}
