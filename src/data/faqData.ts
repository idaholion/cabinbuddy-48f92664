export interface FAQItem {
  question: string;
  answer: string;
}

export interface FAQCategory {
  title: string;
  items: FAQItem[];
}

export const faqData: FAQCategory[] = [
  {
    title: "Getting Started",
    items: [
      {
        question: "What is Cabin Buddy?",
        answer: "Cabin Buddy is a comprehensive platform for managing shared cabin ownership. It helps families coordinate reservations, track expenses, manage work weekends, and communicate effectively."
      },
      {
        question: "How do I join my family's organization?",
        answer: "Your group admin or family lead can share an **invitation link** that takes you directly to join, or they can give you the **organization code** to enter manually. Click the invitation link, or navigate to **Join an Existing Organization** from the home page and enter the code."
      },
      {
        question: "What are the different user roles?",
        answer: "There are three main roles: **Admin** (full management access), **Group Lead** (manages their family group), and **Member** (can make reservations and view information)."
      },
      {
        question: "How do I set up my profile?",
        answer: "Click on your name in the sidebar, then select **Profile Settings**. You can update your name, email, phone number, and other preferences."
      },
      {
        question: "Can I belong to multiple organizations?",
        answer: "Yes! You can join multiple cabin organizations. Use the **Organization Switcher** at the top of the sidebar to switch between them."
      },
      {
        question: "What is a family group?",
        answer: "A family group represents a share-owning unit in your cabin. Each family group has members who can make reservations on behalf of the group."
      }
    ]
  },
  {
    title: "Reservations & Calendar",
    items: [
      {
        question: "How do I make a reservation?",
        answer: "Go to **Cabin Calendar**, click on available dates, and fill out the booking form. You can select single or multiple periods depending on your organization's settings."
      },
      {
        question: "What is the rotation order?",
        answer: "The rotation order determines which family group gets priority during the selection period. It typically rotates each year to ensure fairness."
      },
      {
        question: "When is the selection period?",
        answer: "Selection typically begins October 1st each year. Check your calendar's status dropdown for current phase information and your family's selection window."
      },
      {
        question: "What are primary and secondary selection periods?",
        answer: "**Primary selection** is when families pick their main vacation weeks in rotation order. **Secondary selection** is when families can book additional available time, usually with a rolling selection window."
      },
      {
        question: "Can I extend my reservation?",
        answer: "Yes, if available dates are adjacent to your booking. Click on your reservation and select **Extend Selection** to add more days."
      },
      {
        question: "How do I cancel a reservation?",
        answer: "Click on your reservation in the calendar, then select **Delete Reservation**. Note: This may affect your selection usage depending on timing."
      },
      {
        question: "What is a trade request?",
        answer: "A trade request allows you to swap reservation periods with another family. Navigate to **Cabin Calendar** and use the trade feature to propose a swap."
      },
      {
        question: "Can guests make reservations?",
        answer: "If your organization has guest access enabled, guests can view the calendar and request reservations, which require admin approval."
      }
    ]
  },
  {
    title: "Check-In & Check-Out",
    items: [
      {
        question: "What are checklists?",
        answer: "Checklists are task lists for check-in and check-out procedures. They help ensure the cabin is properly maintained and ready for the next guests."
      },
      {
        question: "How do I access my checklist?",
        answer: "Navigate to **Check-In** or **Checkout List** from the sidebar. Your active reservation's checklist will be displayed."
      },
      {
        question: "Can I customize checklists?",
        answer: "Admins can create and edit checklists in **Seasonal Checklists**. They can add tasks, images, and organize by season."
      },
      {
        question: "What happens if I check out early?",
        answer: "Use the **Early Checkout** feature to adjust your billing. Navigate to your reservation and select the early checkout option."
      },
      {
        question: "How do I report issues during my stay?",
        answer: "Use **Shared Notes** to document any problems or maintenance needs. This helps keep everyone informed about cabin conditions."
      }
    ]
  },
  {
    title: "Financial Management",
    items: [
      {
        question: "How are use fees calculated?",
        answer: "Use fees are calculated based on the number of nights stayed multiplied by the nightly rate set by your organization's admin."
      },
      {
        question: "Where can I view my payment history?",
        answer: "Navigate to **Financial Dashboard** to see your payment history, outstanding balances, and billing details."
      },
      {
        question: "What are recurring bills?",
        answer: "Recurring bills are regular expenses (like property taxes or utilities) that are split among all families. Admins manage these in **Financial Admin Tools**."
      },
      {
        question: "How do I record a payment?",
        answer: "Admins can record payments in the **Payment Tracker** section. Members will see updates reflected in their financial dashboard."
      },
      {
        question: "Can I export financial reports?",
        answer: "Yes, admins can export financial data from the **Admin Season Summary** page for tax purposes or record-keeping."
      },
      {
        question: "What is a billing cycle?",
        answer: "A billing cycle is the period over which use fees are calculated and invoiced. Your organization determines the billing schedule (monthly, quarterly, etc.)."
      },
      {
        question: "How do guest costs work?",
        answer: "If enabled, guests pay a separate fee that can be tracked independently. Admins configure guest pricing in **Organization Settings**."
      }
    ]
  },
  {
    title: "Features & Resources",
    items: [
      {
        question: "What are work weekends?",
        answer: "Work weekends are designated times for cabin maintenance and improvements. Families can propose projects and sign up to help."
      },
      {
        question: "How do I share photos?",
        answer: "Use the **Photo Sharing** feature to upload and share cabin memories with other families."
      },
      {
        question: "What is the shopping list for?",
        answer: "The **Shopping List** helps coordinate supply purchases. Add items you notice are needed during your stay."
      },
      {
        question: "Can I create shared notes?",
        answer: "Yes! **Shared Notes** allow you to document cabin information, maintenance issues, or helpful tips for other families."
      },
      {
        question: "What are cabin rules?",
        answer: "**Cabin Rules** document the agreed-upon guidelines for cabin use. Admins can update these and all members can view them."
      },
      {
        question: "How do surveys and voting work?",
        answer: "Admins can create proposals for family voting on important decisions. Members vote through the **Family Voting** section."
      },
      {
        question: "What are seasonal documents?",
        answer: "Seasonal documents provide guidance specific to different times of year, like winterization procedures or summer opening instructions."
      },
      {
        question: "Can I integrate with Google Calendar?",
        answer: "Yes! Admins can set up Google Calendar sync in **Google Calendar Setup** to share cabin bookings with external calendars."
      }
    ]
  },
  {
    title: "Account & Security",
    items: [
      {
        question: "How do I change my password?",
        answer: "Navigate to **Profile Settings** and select the option to update your password. You'll receive a confirmation email."
      },
      {
        question: "Is my data secure?",
        answer: "Yes, Cabin Buddy uses industry-standard encryption and security practices. Your data is stored securely and never shared with third parties."
      },
      {
        question: "Can I update my phone number?",
        answer: "Yes, go to **Profile Settings** to update your phone number. This is important for receiving notifications and reminders."
      },
      {
        question: "How do notifications work?",
        answer: "You'll receive notifications for important events like selection turn reminders, payment due dates, and work weekend announcements. Configure your preferences in settings."
      },
      {
        question: "What if I forget my password?",
        answer: "Click **Forgot Password** on the login page. You'll receive an email with instructions to reset your password."
      }
    ]
  },
  {
    title: "Troubleshooting",
    items: [
      {
        question: "Why can't I see the calendar?",
        answer: "Make sure you've joined an organization and your admin has set up the rotation for the current year. Check your organization selection in the sidebar."
      },
      {
        question: "My reservation isn't showing up. What should I do?",
        answer: "Try refreshing the page. If it still doesn't appear, check your internet connection and ensure you selected the correct dates. Contact your admin if the issue persists."
      },
      {
        question: "I'm not receiving notifications. How do I fix this?",
        answer: "Check your profile settings to ensure your email and phone number are correct. Also verify that notification preferences are enabled."
      },
      {
        question: "Why can't I make a reservation?",
        answer: "This could be due to: 1) It's not your family's selection turn, 2) You've reached your selection limit, 3) The dates are already booked, or 4) You don't have the necessary permissions."
      },
      {
        question: "The app looks different. What changed?",
        answer: "We regularly update Cabin Buddy with new features and improvements. Check the version indicator in the sidebar footer to see your current version."
      },
      {
        question: "How do I report a bug?",
        answer: "Use the **Feedback** button at the bottom of the sidebar to report issues or suggest improvements."
      }
    ]
  },
  {
    title: "Admin & Group Lead",
    items: [
      {
        question: "How do I add new family groups?",
        answer: "Navigate to **Family Group Setup** and click **Add Family Group**. Enter the family name and contact information."
      },
      {
        question: "How do I set up the rotation order?",
        answer: "Go to **Reservation Setup** to configure rotation order, selection periods, and booking rules for each year."
      },
      {
        question: "Can I customize use fees?",
        answer: "Yes, admins can set nightly rates and billing cycles in **Financial Settings** under Organization Settings."
      },
      {
        question: "How do I send payment reminders?",
        answer: "Use the **Financial Admin Tools** to send bulk payment reminders or individual notifications to families with outstanding balances."
      },
      {
        question: "What is the Admin Season Summary?",
        answer: "The **Admin Season Summary** provides a comprehensive overview of reservations, financials, and usage statistics for the year."
      },
      {
        question: "How do I manage user permissions?",
        answer: "In **Family Group Setup**, you can assign roles (Admin, Group Lead, Member) to control what each user can access and modify."
      },
      {
        question: "Can I export data for record-keeping?",
        answer: "Yes, several sections offer export functionality. Look for export buttons in Financial Dashboard, Admin Season Summary, and other admin tools."
      }
    ]
  }
];
