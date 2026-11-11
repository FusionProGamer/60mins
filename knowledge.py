"""Sample university information (the ONLY knowledge source the assistant may use).
Taken verbatim from the Technopia 2.0 problem statement. Edit here to extend the helpdesk."""

KNOWLEDGE = {
    "Academics": "Students may contact their faculty advisor for academic-related assistance.",
    "Attendance": "Students should follow the minimum attendance requirement prescribed by university regulations.",
    "Examinations": "Examination timetables and notifications are published through official university channels.",
    "Placements": "Students may contact the Placement Department for training and placement-related information.",
    "Library": "Students may access library resources according to the library's timings and regulations.",
    "Hostel": "Hostel-related complaints should be submitted to the Hostel Administration.",
    "Administration": "Students may contact the respective administrative office for certificates and student records.",
    "Events": "University event announcements are shared through official communication channels.",
}

CATEGORIES = list(KNOWLEDGE.keys())


def knowledge_as_text() -> str:
    return "\n".join(f"- [{k}] {v}" for k, v in KNOWLEDGE.items())
