// RSVP Modal functionality
const rsvpButton = document.getElementById('rsvpButton');
const rsvpModal = document.getElementById('rsvpModal');
const closeModal = document.querySelector('.close');
const rsvpForm = document.getElementById('rsvpForm');

// Open modal
rsvpButton.addEventListener('click', () => {
    rsvpModal.style.display = 'block';
    document.body.style.overflow = 'hidden';
});

// Close modal
closeModal.addEventListener('click', () => {
    rsvpModal.style.display = 'none';
    document.body.style.overflow = 'auto';
});

// Close modal when clicking outside
window.addEventListener('click', (event) => {
    if (event.target === rsvpModal) {
        rsvpModal.style.display = 'none';
        document.body.style.overflow = 'auto';
    }
});

// Approved guest list
const approvedGuests = [
    'malik', 'therrance', 'malachi', 'simon', 'marquise', 'nosa', 'nosakhare',
    'sammie', 'xavier', 'kris', 'kristofer', 'amber', 'faith', 'kenneth',
    'zack', 'quanell', 'madison', 'robbie', 'drea', 'andrea', 'darius',
    'keena', 'jaylen', 'rico', "ed'rico", 'edrico', 'willie', 'josh', 'joshua',
    'brittany', 'eriqa', 'deejay', 'darrelka', 'cello', 'marcellous',
    'justin', 'ne', 'shantine', 'kierra', 'gene', 'derrick', 'sean',
    're', 'dharea'
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
            // Success
            alert(`Thank you ${name}! Your RSVP has been submitted successfully. We'll see you at The Museum of Malik!`);
            
            // Close modal and reset form
            rsvpModal.style.display = 'none';
            document.body.style.overflow = 'auto';
            rsvpForm.reset();
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

// CTA Button interaction
const ctaButton = document.querySelector('.cta-button');
if (ctaButton) {
    ctaButton.addEventListener('click', () => {
        // You can customize this action
        alert('Welcome to the Museum of Malik!');
    });
}