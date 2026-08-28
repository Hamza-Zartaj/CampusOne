import React from 'react';
import { MapPin } from 'lucide-react';
import { FormField, SelectField, FileField } from '../components/FormFields';
import { NATIONALITY_OPTIONS } from '../utils/constants';

/**
 * Step 2: Address Section
 */
export const Address = ({ formData, handleChange, handleFileChange }) => {
  const isPakistani = formData.address.nationality === 'Pakistani';

  return (
    <section className="mb-8 pb-6 border-gray-200">
      <h2 className="text-slate-800 text-2xl m-0 mb-6 flex items-center gap-2">
        <MapPin size={20} />
        Address
      </h2>

      {/* Nationality and Domicile */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <SelectField
          label="Nationality"
          name="nationality"
          value={formData.address.nationality}
          onChange={(e) => handleChange(e, 'address')}
          options={NATIONALITY_OPTIONS}
          required
        />

        {isPakistani && (
          <FileField
            label="Domicile Upload (PDF, JPG, PNG - Max 5MB)"
            name="domicileUpload"
            onChange={(e) => handleFileChange(e, 'domicileUpload', 'address')}
            required
            fileName={formData.address.domicileUpload?.name}
          />
        )}
      </div>

      {/* Street and Zip Code */}
      <div className="grid grid-cols-[repeat(auto-fit,minmax(280px,1fr))] gap-6 mb-6">
        <FormField
          label="Street Address"
          name="street"
          value={formData.address.street}
          onChange={(e) => handleChange(e, 'address')}
          placeholder="123 Main Street"
          required
        />
        <FormField
          label="Zip/Postal Code"
          name="zipCode"
          value={formData.address.zipCode}
          onChange={(e) => handleChange(e, 'address')}
          required
        />
      </div>

      {/* City, State, Country */}
      <div className="grid grid-cols-3 gap-6 max-md:grid-cols-1">
        <FormField
          label="City"
          name="city"
          value={formData.address.city}
          onChange={(e) => handleChange(e, 'address')}
          required
        />
        <FormField
          label="State/Province"
          name="state"
          value={formData.address.state}
          onChange={(e) => handleChange(e, 'address')}
          required
        />
        <FormField
          label="Country"
          name="country"
          value={isPakistani ? 'Pakistan' : formData.address.country}
          onChange={(e) => handleChange(e, 'address')}
          disabled={isPakistani}
          placeholder={isPakistani ? 'Pakistan' : 'Enter country'}
          required
        />
      </div>
    </section>
  );
};
