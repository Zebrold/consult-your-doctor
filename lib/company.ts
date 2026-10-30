/** The company's public contact details, shown on the About and Contact pages. */
export const COMPANY = {
  address: "Bockenheimer Landstrasse 17-19, 60325 Frankfurt am Main, Germany",
  addressLines: ["Bockenheimer Landstrasse 17-19", "60325 Frankfurt am Main, Germany"],
  email: "info@zebrold.de",
  phone: "+49 69 21004800",
  phoneHref: "tel:+496921004800",
  /** The footer's social profiles: each icon shows once its address is filled in. */
  social: {
    instagram: "",
    youtube: "",
    linkedin: "",
  },
};

export const directionsUrl = `https://www.google.com/maps/dir/?api=1&destination=${encodeURIComponent(COMPANY.address)}`;
