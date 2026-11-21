# Project Conventions & Safeguarding Rules

- Use shared Header, Footer and PageHeading from site-shell for public pages, keeping navigation consistent.
- All public enquiry forms use the shared Zod schema and server-only intake RPC; submissions have no browser grants or read policies, protecting children's information.
- Maintain learning resources in src/lib/resources.ts and page metadata in each leaf route; external resources must identify their publisher.
- Enquiry alerts use the connected email account server-side and send only to the site-configured owner email; never accept a notification recipient from the browser, and preserve saved enquiries if sending fails.
