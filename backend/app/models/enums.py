import enum

class Role(str, enum.Enum):
    SUPERADMIN = "SUPERADMIN"
    ADMIN = "ADMIN"
    TEACHER = "TEACHER"
    STUDENT = "STUDENT"
    PARENT = "PARENT"

class Gender(str, enum.Enum):
    MALE = "Male"
    FEMALE = "Female"
    OTHER = "Other"

class StudentStatus(str, enum.Enum):
    ACTIVE = "ACTIVE"
    INACTIVE = "INACTIVE"
    GRADUATED = "GRADUATED"
    TRANSFERRED = "TRANSFERRED"

class InstallmentType(str, enum.Enum):
    MONTHLY = "Monthly"
    QUARTERLY = "Quarterly"
    HALF_YEARLY = "Half Yearly"
    ANNUALLY = "Annually"

class FeeApplicability(str, enum.Enum):
    ALL = "All"
    HOSTELLERS = "Hostellers"
    DAY_SCHOLARS = "Day Scholars"

class RollNumberAssignmentType(str, enum.Enum):
    AUTO_BOYS = "AUTO_BOYS"
    AUTO_GIRLS = "AUTO_GIRLS"
    AUTO_NORMAL = "AUTO_NORMAL"
    MANUAL = "MANUAL"
