import AdminQuestionEditorClient from '../../../../../../../components/admin/AdminQuestionEditorClient';

export default function EditQuestionPage({
  params,
  searchParams,
}: {
  params: { slug: string; questionKey: string };
  searchParams: { section?: string };
}) {
  return (
    <main className="page-shell survey-shell">
      <AdminQuestionEditorClient
        slug={params.slug}
        mode="edit"
        questionKey={decodeURIComponent(params.questionKey)}
        initialSection={searchParams.section}
      />
    </main>
  );
}
