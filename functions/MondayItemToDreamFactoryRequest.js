function MondayItemToDreamFactoryRequest(item) {
    const getV = (id, prop = null) => { // Shorter helper name: getVal
        const m = item.mappable_column_values;
        if (!m || m[id] === undefined || m[id] === null) return null;
        const v = m[id];
        if (prop && typeof v === 'object') return v[prop] !== undefined ? v[prop] : null;
        if (!prop && typeof v !== 'object') return v;
        if (prop && typeof v !== 'object') return null;
        return v;
    };

    let fn = "N/A", ln = "N/A"; // firstname, lastname
    if (item.name && typeof item.name === 'string') {
        const ps = item.name.trim().split(/\s+/);
        fn = ps[0] || "N/A";
        if (ps.length > 1) ln = ps.slice(1).join(" ");
        else ln = "N/A"; // Ensure lastname has a value if only one name part
    }

    let ad1 = "N/A", ad2 = null, cty = "Unknown City", st = null, zp = null; // address parts
    const adTxt = getV('text_mkreawt9');
    if (adTxt && typeof adTxt === 'string') {
        const lns = adTxt.split('\n').map(s => s.trim()).filter(s => s.length > 0);
        if (lns.length > 0) ad1 = lns[0];
        if (lns.length > 1) ad2 = lns.slice(1).join(' ');
        // City, State, Zip are not reliably parsable from the combined text in compact code.
        // 'cty' uses a default because it's NOT NULL in PSQL.
    }

    const countryData = getV('country_mkreqtxv');
    const ctry = (countryData && countryData.countryName) ? countryData.countryName : "N/A"; // country

    const emailData = getV('email_mkreejkw');
    const eml = (emailData && emailData.email) ? emailData.email : null; // email

    const phoneData = getV('phone_mkrezeyh');
    const phn = (phoneData && phoneData.phone) ? phoneData.phone : null; // phone

    const ccExData = getV('date_mkrep80y');
    const ccEx = (ccExData && ccExData.date) ? ccExData.date : "N/A"; // creditcardexpiration

    const genderData = getV('dropdown_mkresq0y');
    const gdr = (genderData && genderData.text && genderData.text.length > 0) ? genderData.text.charAt(0).toUpperCase() : null; // gender

    const rgn = 1; // region - Placeholder, YOU MUST SET THIS appropriately
    const ccTyp = 0; // creditcardtype - Placeholder
    const ccNum = "N/A"; // creditcard - Placeholder
    
    let usr = `${fn.toLowerCase().replace(/[^a-z0-9]/gi,'')}${ln !== "N/A" ? ln.toLowerCase().replace(/[^a-z0-9]/gi,'') : ''}`;
    if (!usr || usr === "nan/a") {
        const custIdMon = getV('numeric_mkree48r');
        usr = `user${custIdMon || (item.id ? String(item.id).slice(-4) : '') || Math.floor(Math.random()*1000)}`;
    }
    usr = usr.substring(0,50);

    const pwd = "DefaultPass123!"; // password - Placeholder, ensure proper handling

    const rec = { // psqlRecord
        firstname: fn.substring(0, 50),
        lastname: ln.substring(0, 50),
        address1: ad1.substring(0, 50),
        address2: ad2 ? ad2.substring(0, 50) : null,
        city: cty.substring(0, 50),
        state: st ? st.substring(0, 50) : null,
        zip: zp,
        country: ctry.substring(0, 50),
        region: rgn,
        email: eml ? eml.substring(0, 50) : null,
        phone: phn ? phn.substring(0, 50) : null,
        creditcardtype: ccTyp,
        creditcard: ccNum.substring(0, 50),
        creditcardexpiration: ccEx.substring(0, 50),
        username: usr,
        password: pwd.substring(0, 50),
        age: null,
        income: null,
        gender: gdr
    };

    return { // DreamFactory Request Body
      resource: [rec],
      ids: [],      // Default for create
      filter: "",   // Default for create
      params: []    // Default for create
    };
}