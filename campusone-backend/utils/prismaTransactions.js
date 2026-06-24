const DEFAULT_MAX_RETRIES = 3;

export const runSerializableTransaction = async (
  prisma,
  operation,
  { maxRetries = DEFAULT_MAX_RETRIES } = {}
) => {
  let attempt = 0;

  while (attempt < maxRetries) {
    try {
      return await prisma.$transaction(operation, {
        isolationLevel: 'Serializable',
      });
    } catch (error) {
      attempt += 1;
      if (error?.code !== 'P2034' || attempt >= maxRetries) {
        throw error;
      }
    }
  }

  throw new Error('Serializable transaction retry limit exceeded');
};
