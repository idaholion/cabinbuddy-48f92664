import { createPortal } from 'react-dom';

interface DirectoryMember {
  familyGroup: string;
  memberName: string;
  memberEmail: string;
  memberPhone: string;
  memberType: 'group_lead' | 'host_member';
}

interface FamilyDirectoryPrintProps {
  organizationName: string;
  members: DirectoryMember[];
}

export function FamilyDirectoryPrint({ organizationName, members }: FamilyDirectoryPrintProps) {
  const families = Array.from(new Set(members.map(member => member.familyGroup)));

  return createPortal(
    <article className="family-directory-print" aria-hidden="true">
      <header>
        <h1>Family Group Overview</h1>
        <p>{organizationName}</p>
        <p>{families.length} family groups · {members.length} members · Printed {new Date().toLocaleDateString()}</p>
      </header>
      <div className="family-directory-print-columns">
        {families.map(family => (
          <section className="family-directory-print-group" key={family}>
            <h2>{family}</h2>
            {members.filter(member => member.familyGroup === family).map((member, index) => (
              <div className="family-directory-print-member" key={`${member.memberName}-${index}`}>
                <h3>{member.memberName}{member.memberType === 'group_lead' && <span> · Lead</span>}</h3>
                <p>{member.memberEmail || 'No email listed'}</p>
                {member.memberPhone && <p>{member.memberPhone}</p>}
              </div>
            ))}
          </section>
        ))}
      </div>
    </article>,
    document.body,
  );
}