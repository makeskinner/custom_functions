function generateMondayData(numberOfRecords) {
    function getRandomInt(min, max) {
        min = Math.ceil(min);
        max = Math.floor(max);
        return Math.floor(Math.random() * (max - min + 1)) + min;
    }

    function getRandomElement(arr) {
        if (!arr || arr.length === 0) return "";
        return arr[Math.floor(Math.random() * arr.length)];
    }

    function formatDateToMonday(dateObj) {
        const year = dateObj.getFullYear();
        const month = String(dateObj.getMonth() + 1).padStart(2, '0');
        const day = String(dateObj.getDate()).padStart(2, '0');
        return `${year}-${month}-${day}`;
    }

    const firstNames = ["Al", "Jo", "Ed"];
    const lastNames = ["Sm", "Do", "Le"];
    const streetTypes = ["St", "Rd", "Av"];
    const streetNames = ["Oak", "Elm", "Ash"];
    const cities = ["CityA", "TownB", "VillC"];
    const statesOrCounties = ["StateX", "CountyY", "RegionZ"];
    const countries = ["US", "UK"];
    const emailDomains = ["ex.co", "tst.org"];

    const phoneCountryData = [
        { c: "US", p: "+1", l: 10 }, { c: "GB", p: "+44", l: 10 },
        { c: "DE", p: "+49", l: 10 }
    ];

    function generateClientNameInternal() {
        const firstName = getRandomElement(firstNames);
        const lastName = getRandomElement(lastNames);
        const fullName = `${firstName} ${lastName}`;
        return {
            firstName: firstName,
            lastName: lastName,
            fullName: fullName.substring(0, 50)
        };
    }

    function generateDueDateInternal() {
        const today = new Date();
        const futureDate = new Date(today.getTime());
        futureDate.setDate(today.getDate() + getRandomInt(1, 60));
        return formatDateToMonday(futureDate);
    }

    function generateAddressInternal() {
        const selectedCountryName = getRandomElement(countries);
        const line1 = `${getRandomInt(1, 999)} ${getRandomElement(streetNames)} ${getRandomElement(streetTypes)}`;
        let line2 = "";
        if (Math.random() < 0.3) {
            const aptTypes = ["Apt", "Un", "Ste"]; // Shortened
            line2 = `${getRandomElement(aptTypes)} ${getRandomInt(1, 100)}`;
        }
        return {
            "first line": line1.substring(0, 50),
            "second line": line2.substring(0, 50),
            "City": getRandomElement(cities).substring(0, 50),
            "State/County": getRandomElement(statesOrCounties).substring(0, 50),
            "Zip": getRandomInt(10000, 99999),
            "Country": selectedCountryName.substring(0, 50)
        };
    }

    function generateEmailAddressInternal(firstName, lastName) {
        const fn = firstName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const ln = lastName.toLowerCase().replace(/[^a-z0-9]/g, '');
        const domain = getRandomElement(emailDomains);
        const prefix = `${fn}.${ln}`;
        const availableLengthForPrefix = 50 - (domain.length + 1);
        const truncatedPrefix = prefix.substring(0, availableLengthForPrefix);
        return `${truncatedPrefix}@${domain}`;
    }

    function generatePhoneNumberObjectInternal() {
        const countryData = getRandomElement(phoneCountryData);
        let number = "";
        for (let i = 0; i < countryData.l; i++) { // Using .l for length
            number += getRandomInt(0, 9);
        }
        const e164Number = `${countryData.p}${number}`; // Using .p for prefix
        return {
            "phone": e164Number,
            "countryShortName": countryData.c // Using .c for code
        };
    }

    function generateGenderInternal() {
        return getRandomElement(['M', 'F', 'N']);
    }

    function generateCCExpiryDateInternal() {
        const today = new Date();
        const futureYear = today.getFullYear() + getRandomInt(1, 5);
        const month = getRandomInt(1, 12);
        const lastDayOfMonth = new Date(futureYear, month, 0).getDate();
        const expiryDate = new Date(futureYear, month - 1, lastDayOfMonth);
        return formatDateToMonday(expiryDate);
    }

    const results = [];
    let currentCustomerID = getRandomInt(1000, 20000);

    if (typeof numberOfRecords !== 'number' || numberOfRecords <= 0) {
        return [];
    }

    for (let i = 0; i < numberOfRecords; i++) {
        const clientInfo = generateClientNameInternal();
        const addressInfo = generateAddressInternal();
        const email = generateEmailAddressInternal(clientInfo.firstName, clientInfo.lastName);
        const phoneInfo = generatePhoneNumberObjectInternal();

        results.push({
            "Client": clientInfo.fullName,
            "Due date": generateDueDateInternal(),
            "Customer ID": currentCustomerID++,
            "Address": addressInfo,
            "Email address": email,
            "Phone number": phoneInfo,
            "Gender": generateGenderInternal(),
            "Credit Card Expiry Date": generateCCExpiryDateInternal()
        });
    }
    return JSON.stringify(results);
}