// Wait for DOM to be fully loaded
document.addEventListener('DOMContentLoaded', () => {
    // RSVP Modal functionality
    const rsvpButton = document.getElementById('rsvpButton');
    const rsvpModal = document.getElementById('rsvpModal');
    const closeModal = document.querySelector('.close');
    const rsvpForm = document.getElementById('rsvpForm');

    // Close modal
    if (closeModal) {
        closeModal.addEventListener('click', () => {
            rsvpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetModalState();
        });
    }

    // Close modal when clicking outside
    window.addEventListener('click', (event) => {
        if (event.target === rsvpModal) {
            rsvpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetModalState();
        }
    });

    // Approved guest list
    const approvedGuests = [
    'malik', 'therrance', 'malachi', 'simon', 'marquise', 'nosa', 'nosakhare',
    'sammie', 'xavier', 'kris', 'kristofer', 'amber', 'faith', 'kenneth',
    'zack', 'quanell', 'madison', 'robbie', 'drea', 'andrea', 'darius',
    'keena', 'jaylen', 'rico', "ed'rico", 'edrico', 'willie', 'josh', 'joshua',
    'brittany', 'eriqa', 'deejay', 'darrelka', 'cello', 'marcellous',
    'justin', 'ne', 'shantine', 'kierra', 'gene', 'derrick', 'sean', 'josh', 'joshua', 'brenda', 
    're', 'dharea', 'boyd', 'jamina', 'mimi', 'gabby', 'gabriel', 'caleb', 'dionte', 'dionté', 'cortez', 'deanthony'
    ];

    // Function to check if name is on guest list
    function isApprovedGuest(name) {
    const cleanName = name.toLowerCase().trim().replace(/[^a-z']/g, '');
    return approvedGuests.some(approvedName => {
        const cleanApproved = approvedName.toLowerCase().replace(/[^a-z']/g, '');
        return cleanName === cleanApproved || cleanName.includes(cleanApproved) || cleanApproved.includes(cleanName);
        });
    }

    // Handle form submission
    rsvpForm.addEventListener('submit', async (e) => {
    e.preventDefault();
    
    const formData = new FormData(rsvpForm);
    const name = formData.get('name');
    const email = formData.get('email');
    const address = formData.get('address');
    const phone = formData.get('phone');
    
    // Simple validation
    if (!name || !email || !address) {
        alert('Please fill in all required fields.');
        return;
    }
    
    // Check if name is on approved guest list
    if (!isApprovedGuest(name)) {
        alert('We apologize, but RSVPs are limited to invited guests only. If you believe this is an error, please contact malik@studioeight08.co');
        return;
    }
    
    // Disable submit button and show loading
    const submitBtn = rsvpForm.querySelector('.submit-btn');
    const originalText = submitBtn.textContent;
    submitBtn.textContent = 'Submitting...';
    submitBtn.disabled = true;
    
    try {
        // Submit to Formspree
        const response = await fetch('https://formspree.io/f/mnjjyrlw', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                name: name,
                email: email,
                address: address,
                phone: phone || '',
                event: 'The Museum of Malik - A 30-Year Retrospective',
                date: '04/25/26'
            })
        });
        
        if (response.ok) {
            // Success - directly show calendar options without alert
            showCalendarOptions(name);
        } else {
            throw new Error('Network response was not ok');
        }
        
    } catch (error) {
        console.error('Error submitting RSVP:', error);
        alert('There was an error submitting your RSVP. Please try again or contact us directly at malik@studioeight08.co');
    } finally {
        // Re-enable submit button
        submitBtn.textContent = originalText;
        submitBtn.disabled = false;
        }
    });

    // Calendar functionality
    function showCalendarOptions(guestName) {
    // Hide the form and show calendar buttons
        document.getElementById('rsvpForm').style.display = 'none';
        document.getElementById('calendarButtons').style.display = 'block';
        
        // Update modal title
        const modalTitle = rsvpModal.querySelector('h2');
        modalTitle.textContent = `Thank you, ${guestName}!`;
        
        // Update subtitle
        const modalSubtitle = rsvpModal.querySelector('.modal-subtitle');
        modalSubtitle.textContent = 'Your RSVP has been submitted successfully. We\'ll see you at The Museum of Malik!\n\nSaturday, April 25, 2026 • 6:00 PM - 10:00 PM\nStudio Eight08, 808 Travis St, Houston, TX';
        modalSubtitle.style.whiteSpace = 'pre-line';
    }

    function generateGoogleCalendarUrl() {
    const event = {
        title: 'The Museum of Malik - A 30-Year Retrospective',
        start: '20260425T230000Z', // April 25, 2026, 6:00 PM CDT = April 25 23:00 UTC
        end: '20260426T030000Z',   // April 25, 2026, 10:00 PM CDT = April 26 03:00 UTC
        details: 'Join us for an intimate exhibition celebrating three decades of artistic journey at The Museum of Malik.',
        location: 'Studio Eight08, 808 Travis St, Houston, TX 77002'
    };
    
    const baseUrl = 'https://calendar.google.com/calendar/render';
    const params = new URLSearchParams({
        action: 'TEMPLATE',
        text: event.title,
        dates: `${event.start}/${event.end}`,
        details: event.details,
        location: event.location
    });
        
        return `${baseUrl}?${params.toString()}`;
    }

    function generateAppleCalendarUrl() {
    const event = {
        title: 'The Museum of Malik - A 30-Year Retrospective',
        start: '20260425T230000Z', // April 25, 2026, 6:00 PM CDT = April 25 23:00 UTC
        end: '20260426T030000Z',   // April 25, 2026, 10:00 PM CDT = April 26 03:00 UTC
        description: 'Join us for an intimate exhibition celebrating three decades of artistic journey at The Museum of Malik.',
        location: 'Studio Eight08, 808 Travis St, Houston, TX 77002'
    };
    
    // Create ICS content
    const icsContent = `BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//Museum of Malik//Event//EN
BEGIN:VEVENT
UID:museum-malik-${Date.now()}@studioeight08.co
DTSTAMP:${new Date().toISOString().replace(/[-:]/g, '').split('.')[0]}Z
DTSTART:${event.start}
DTEND:${event.end}
SUMMARY:${event.title}
DESCRIPTION:${event.description}
LOCATION:${event.location}
END:VEVENT
END:VCALENDAR`;
        
        return `data:text/calendar;charset=utf8,${encodeURIComponent(icsContent)}`;
    }

    // Calendar button event listeners
    const googleCalBtn = document.getElementById('googleCalBtn');
    const appleCalBtn = document.getElementById('appleCalBtn');
    
    googleCalBtn.addEventListener('click', () => {
        window.open(generateGoogleCalendarUrl(), '_blank');
        // Close modal after a delay to allow calendar to open
        setTimeout(() => {
            rsvpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetModalState();
        }, 1000);
    });
    
    appleCalBtn.addEventListener('click', () => {
        const icsUrl = generateAppleCalendarUrl();
        // Create a temporary link to download the ICS file
        const link = document.createElement('a');
        link.href = icsUrl;
        link.download = 'museum-of-malik-event.ics';
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        
        // Close modal after a delay
        setTimeout(() => {
            rsvpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            resetModalState();
        }, 1000);
    });

    function resetModalState() {
    // Reset modal to original state
        document.getElementById('rsvpForm').style.display = 'block';
        document.getElementById('calendarButtons').style.display = 'none';
        
        const modalTitle = rsvpModal.querySelector('h2');
        modalTitle.textContent = 'RSVP';
        
        const modalSubtitle = rsvpModal.querySelector('.modal-subtitle');
        modalSubtitle.textContent = 'One guest per invitation';
        
        rsvpForm.reset();
    }
});