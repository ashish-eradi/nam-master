import React, { useState } from 'react';
import { Button, Box, Stepper, Step, StepLabel, Typography } from '@mui/material';
import { School } from '../services/schoolsApi';
import BasicInfoStep from './schoolWizardSteps/BasicInfoStep';
import ContactDetailsStep from './schoolWizardSteps/ContactDetailsStep';
import ReviewConfirmStep from './schoolWizardSteps/ReviewConfirmStep';

interface SchoolWizardProps {
  initialData?: Partial<School>;
  onSubmit: (data: Partial<School>) => void;
  onCancel: () => void;
}

const steps = ['Basic Information', 'Contact Details', 'Review & Confirm'];

const SchoolWizard: React.FC<SchoolWizardProps> = ({ initialData = {}, onSubmit, onCancel }) => {
  const isEditMode = !!initialData.id;

  // For new schools default is_offline to false (Online) if not already set
  const defaultData: Partial<School> = isEditMode
    ? initialData
    : { is_offline: false, ...initialData };

  const [activeStep, setActiveStep] = useState(0);
  const [formData, setFormData] = useState<Partial<School>>(defaultData);

  const handleNext = () => setActiveStep((s) => s + 1);
  const handleBack = () => setActiveStep((s) => s - 1);

  const handleChange = (field: keyof School, value: any) => {
    // Lock is_offline field in edit mode — mode cannot change after creation
    if (field === 'is_offline' && isEditMode) return;
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleReset = () => {
    setActiveStep(0);
    setFormData(defaultData);
  };

  const getStepContent = (step: number) => {
    switch (step) {
      case 0:
        return <BasicInfoStep formData={formData} handleChange={handleChange} isEditMode={isEditMode} />;
      case 1:
        return <ContactDetailsStep formData={formData} handleChange={handleChange} />;
      case 2:
        return <ReviewConfirmStep formData={formData} />;
      default:
        return <Typography>Unknown step</Typography>;
    }
  };

  return (
    <Box sx={{ width: '100%' }}>
      <Stepper activeStep={activeStep}>
        {steps.map((label) => (
          <Step key={label}>
            <StepLabel>{label}</StepLabel>
          </Step>
        ))}
      </Stepper>

      <div>
        {activeStep === steps.length ? (
          <React.Fragment>
            <Typography sx={{ mt: 2, mb: 1 }}>
              All steps completed — click Finish to {isEditMode ? 'update' : 'create'} the school.
            </Typography>
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Box sx={{ flex: '1 1 auto' }} />
              <Button onClick={handleReset}>Reset</Button>
              <Button onClick={() => onSubmit(formData)} variant="contained" sx={{ ml: 1 }}>
                Finish
              </Button>
              <Button onClick={onCancel} sx={{ ml: 1 }}>Close</Button>
            </Box>
          </React.Fragment>
        ) : (
          <React.Fragment>
            {getStepContent(activeStep)}
            <Box sx={{ display: 'flex', flexDirection: 'row', pt: 2 }}>
              <Button color="inherit" disabled={activeStep === 0} onClick={handleBack} sx={{ mr: 1 }}>
                Back
              </Button>
              <Box sx={{ flex: '1 1 auto' }} />
              <Button onClick={activeStep === steps.length - 1 ? () => onSubmit(formData) : handleNext}>
                {activeStep === steps.length - 1 ? 'Review' : 'Next'}
              </Button>
            </Box>
          </React.Fragment>
        )}
      </div>
    </Box>
  );
};

export default SchoolWizard;
